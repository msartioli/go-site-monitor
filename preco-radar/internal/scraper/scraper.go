package scraper

import (
	"context"
	"errors"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const maxBodyBytes = 2 << 20

type Result struct {
	Title      string  `json:"title"`
	Price      float64 `json:"price"`
	Currency   string  `json:"currency"`
	StatusCode int     `json:"status_code"`
}

type Client struct {
	HTTP *http.Client
}

func New() *Client {
	return &Client{HTTP: &http.Client{Timeout: 12 * time.Second}}
}

func (c *Client) Fetch(rawURL, priceRegex string) (Result, error) {
	if err := validateURL(rawURL); err != nil {
		return Result{}, err
	}

	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return Result{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; PrecoRadar/0.1; +https://github.com/msartioli)")
	req.Header.Set("Accept-Language", "pt-BR,pt;q=0.9,en;q=0.8")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return Result{}, fmt.Errorf("fetch product: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 400 {
		return Result{StatusCode: resp.StatusCode}, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBodyBytes))
	if err != nil {
		return Result{StatusCode: resp.StatusCode}, fmt.Errorf("read html: %w", err)
	}
	page := string(body)

	title := extractFirst(page,
		`(?is)<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']`,
		`(?is)<title[^>]*>(.*?)</title>`,
	)
	title = strings.TrimSpace(html.UnescapeString(stripTags(title)))

	rawPrice := ""
	if strings.TrimSpace(priceRegex) != "" {
		re, compileErr := regexp.Compile(priceRegex)
		if compileErr != nil {
			return Result{Title: title, StatusCode: resp.StatusCode}, fmt.Errorf("invalid price regex: %w", compileErr)
		}
		match := re.FindStringSubmatch(page)
		if len(match) < 2 {
			return Result{Title: title, StatusCode: resp.StatusCode}, errors.New("configured price regex did not match")
		}
		rawPrice = match[1]
	} else {
		rawPrice = extractFirst(page,
			`(?is)<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']`,
			`(?is)<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']`,
			`(?is)["']price["']\s*:\s*["']?([0-9][0-9.,]*)`,
		)
	}

	if strings.TrimSpace(rawPrice) == "" {
		return Result{Title: title, StatusCode: resp.StatusCode}, errors.New("price not found; configure price_regex for this store")
	}

	price, err := ParsePrice(rawPrice)
	if err != nil {
		return Result{Title: title, StatusCode: resp.StatusCode}, err
	}

	currency := extractFirst(page,
		`(?is)<meta[^>]+property=["']product:price:currency["'][^>]+content=["']([^"']+)["']`,
		`(?is)<meta[^>]+itemprop=["']priceCurrency["'][^>]+content=["']([^"']+)["']`,
		`(?is)["']priceCurrency["']\s*:\s*["']([A-Za-z]{3})["']`,
	)
	if currency == "" {
		currency = "BRL"
	}

	return Result{Title: title, Price: price, Currency: strings.ToUpper(currency), StatusCode: resp.StatusCode}, nil
}

func validateURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Hostname() == "" {
		return errors.New("invalid URL")
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return errors.New("only http and https URLs are allowed")
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return errors.New("local addresses are not allowed")
	}
	if ip := net.ParseIP(host); ip != nil && !isPublicIP(ip) {
		return errors.New("private or local IP addresses are not allowed")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
	if err == nil {
		for _, ip := range ips {
			if !isPublicIP(ip) {
				return errors.New("URL resolves to a private or local IP address")
			}
		}
	}
	return nil
}

func isPublicIP(ip net.IP) bool {
	return !(ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() || ip.IsMulticast())
}

var nonPrice = regexp.MustCompile(`[^0-9,.-]`)

func ParsePrice(raw string) (float64, error) {
	s := strings.TrimSpace(nonPrice.ReplaceAllString(raw, ""))
	if s == "" {
		return 0, fmt.Errorf("invalid price %q", raw)
	}

	lastComma := strings.LastIndex(s, ",")
	lastDot := strings.LastIndex(s, ".")
	switch {
	case lastComma > lastDot:
		s = strings.ReplaceAll(s, ".", "")
		s = strings.ReplaceAll(s, ",", ".")
	case lastDot > lastComma:
		if strings.Count(s, ".") > 1 {
			parts := strings.Split(s, ".")
			decimal := parts[len(parts)-1]
			s = strings.Join(parts[:len(parts)-1], "") + "." + decimal
		}
		s = strings.ReplaceAll(s, ",", "")
	default:
		s = strings.ReplaceAll(s, ",", ".")
	}

	value, err := strconv.ParseFloat(s, 64)
	if err != nil || value <= 0 {
		return 0, fmt.Errorf("invalid price %q", raw)
	}
	return value, nil
}

func extractFirst(text string, patterns ...string) string {
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		match := re.FindStringSubmatch(text)
		if len(match) > 1 {
			return strings.TrimSpace(match[1])
		}
	}
	return ""
}

func stripTags(s string) string {
	re := regexp.MustCompile(`(?s)<[^>]*>`)
	return re.ReplaceAllString(s, "")
}
