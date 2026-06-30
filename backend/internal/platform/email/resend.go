package email

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const resendAPIURL = "https://api.resend.com/emails"

// Client sends transactional emails via the Resend API.
type Client struct {
	apiKey     string
	httpClient *http.Client
	from       string
}

// NewClient creates a Resend email client.
func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:     apiKey,
		httpClient: &http.Client{},
		from:       "CoFi Finance <onboarding@resend.dev>",
	}
}

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

// SendVerificationEmail sends a verification link to the given address.
func (c *Client) SendVerificationEmail(to, verificationURL string) error {
	html := fmt.Sprintf(`<p>Welcome to CoFi Finance!</p>
<p>Click the link below to verify your email address:</p>
<p><a href="%s">Verify your email</a></p>
<p>This link expires in 24 hours.</p>
<p>If you did not create an account, you can safely ignore this email.</p>`, verificationURL)

	payload := resendPayload{
		From:    c.from,
		To:      []string{to},
		Subject: "Verify your CoFi Finance email",
		HTML:    html,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, resendAPIURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "cofi-finance/1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend API error: status %d", resp.StatusCode)
	}
	return nil
}
