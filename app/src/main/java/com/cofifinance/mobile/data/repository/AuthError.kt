package com.cofifinance.mobile.data.repository

sealed class AuthError(message: String) : Throwable(message) {
    data object InvalidCredentials : AuthError("Invalid credentials")
    data object EmailNotVerified : AuthError("Email not verified")
    data object EmailAlreadyInUse : AuthError("Email already in use")
    data object InvalidInput : AuthError("Invalid input")
    data class Unknown(val cause0: Throwable) : AuthError(cause0.message ?: "Unknown error")
}
