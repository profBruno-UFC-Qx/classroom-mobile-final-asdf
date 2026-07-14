package com.cofifinance.mobile.core.session

sealed interface AuthState {
    data object Loading : AuthState
    data object Unauthenticated : AuthState
    data class Authenticated(val tokens: TokenPair) : AuthState
}

data class TokenPair(
    val accessToken: String,
    val refreshToken: String,
)
