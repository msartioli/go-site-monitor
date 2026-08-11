package handler

import (
	"encoding/json"
	"net/http"

	"github.com/msartioli/go-site-monitor/preco-radar/internal/scraper"
)

type requestBody struct {
	URL        string `json:"url"`
	PriceRegex string `json:"price_regex"`
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body requestBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.URL == "" {
		http.Error(w, "invalid JSON: url is required", http.StatusBadRequest)
		return
	}

	result, err := scraper.New().Fetch(body.URL, body.PriceRegex)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}
