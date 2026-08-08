package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/msartioli/go-site-monitor/preco-radar/internal/scraper"
	db "github.com/msartioli/go-site-monitor/preco-radar/internal/supabase"
)

type runResult struct {
	Checked int      `json:"checked"`
	Updated int      `json:"updated"`
	Alerts  []string `json:"alerts"`
	Errors  []string `json:"errors"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if secret := os.Getenv("CRON_SECRET"); secret != "" {
		auth := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if auth != secret {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
	}

	client, err := db.NewFromEnv()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	products, err := client.ActiveProducts()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	sc := scraper.New()
	output := runResult{Errors: []string{}, Alerts: []string{}}

	for _, product := range products {
		output.Checked++
		result, fetchErr := sc.Fetch(product.URL, product.PriceRegex)
		if fetchErr != nil {
			message := fmt.Sprintf("%s: %v", product.Name, fetchErr)
			output.Errors = append(output.Errors, message)
			_ = client.MarkError(product.ID, fetchErr.Error())
			continue
		}

		if err := client.InsertHistory(db.PriceHistory{
			ProductID:    product.ID,
			Price:        result.Price,
			Currency:     result.Currency,
			RawTitle:     result.Title,
			SourceStatus: result.StatusCode,
		}); err != nil {
			output.Errors = append(output.Errors, fmt.Sprintf("%s history: %v", product.Name, err))
			continue
		}

		if err := client.UpdateProduct(product.ID, result.Price, result.Title, ""); err != nil {
			output.Errors = append(output.Errors, fmt.Sprintf("%s update: %v", product.Name, err))
			continue
		}

		output.Updated++
		if product.TargetPrice != nil && result.Price <= *product.TargetPrice {
			output.Alerts = append(output.Alerts, fmt.Sprintf("%s chegou a %.2f %s", product.Name, result.Price, result.Currency))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(output)
}
