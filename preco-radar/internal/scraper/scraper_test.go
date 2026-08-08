package scraper

import "testing"

func TestParsePrice(t *testing.T) {
	tests := []struct {
		raw  string
		want float64
	}{
		{"R$ 1.999,90", 1999.90},
		{"1999.90", 1999.90},
		{"R$ 99,99", 99.99},
		{"2499", 2499},
	}

	for _, tt := range tests {
		got, err := ParsePrice(tt.raw)
		if err != nil {
			t.Fatalf("ParsePrice(%q): %v", tt.raw, err)
		}
		if got != tt.want {
			t.Fatalf("ParsePrice(%q) = %v, want %v", tt.raw, got, tt.want)
		}
	}
}

func TestRejectLocalhost(t *testing.T) {
	if err := validateURL("http://localhost:3000"); err == nil {
		t.Fatal("expected localhost URL to be rejected")
	}
}
