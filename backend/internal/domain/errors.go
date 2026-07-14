package domain

import "errors"

var (
	ErrNotFound          = errors.New("not found")
	ErrConflict          = errors.New("conflict")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrBadRequest        = errors.New("bad request")
	ErrEmailNotVerified  = errors.New("email not verified")
)
