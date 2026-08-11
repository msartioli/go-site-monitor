package supabase

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type Product struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	URL          string   `json:"url"`
	PriceRegex   string   `json:"price_regex"`
	TargetPrice  *float64 `json:"target_price"`
	CurrentPrice *float64 `json:"current_price"`
	Currency     string   `json:"currency"`
}

type PriceHistory struct {
	ProductID    string  `json:"product_id"`
	Price        float64 `json:"price"`
	Currency     string  `json:"currency"`
	RawTitle     string  `json:"raw_title,omitempty"`
	SourceStatus int     `json:"source_status"`
}

type Client struct {
	BaseURL string
	Key     string
	HTTP    *http.Client
}

func NewFromEnv() (*Client, error) {
	baseURL := strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
	key := os.Getenv("SUPABASE_SECRET_KEY")
	if baseURL == "" || key == "" {
		return nil, fmt.Errorf("SUPABASE_URL and SUPABASE_SECRET_KEY are required")
	}
	return &Client{BaseURL: baseURL, Key: key, HTTP: &http.Client{Timeout: 12 * time.Second}}, nil
}

func (c *Client) ActiveProducts() ([]Product, error) {
	var products []Product
	err := c.request(http.MethodGet, "/rest/v1/products?active=eq.true&select=id,name,url,price_regex,target_price,current_price,currency", nil, &products, "")
	return products, err
}

func (c *Client) InsertHistory(history PriceHistory) error {
	return c.request(http.MethodPost, "/rest/v1/price_history", history, nil, "return=minimal")
}

func (c *Client) UpdateProduct(id string, price float64, title, lastError string) error {
	payload := map[string]any{
		"current_price":   price,
		"last_title":      title,
		"last_error":      lastError,
		"last_checked_at": time.Now().UTC().Format(time.RFC3339),
	}
	return c.request(http.MethodPatch, "/rest/v1/products?id=eq."+id, payload, nil, "return=minimal")
}

func (c *Client) MarkError(id, message string) error {
	payload := map[string]any{
		"last_error":      message,
		"last_checked_at": time.Now().UTC().Format(time.RFC3339),
	}
	return c.request(http.MethodPatch, "/rest/v1/products?id=eq."+id, payload, nil, "return=minimal")
}

func (c *Client) request(method, path string, body any, out any, prefer string) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", c.Key)
	req.Header.Set("Authorization", "Bearer "+c.Key)
	req.Header.Set("Content-Type", "application/json")
	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	}

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("supabase returned %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			return err
		}
	}
	return nil
}
