package com.cofifinance.mobile.ui.auth.viewmodel

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isSubmitting: Boolean = false,
    val emailError: Int? = null,
    val passwordError: Int? = null,
    val formError: Int? = null,
    val loggedIn: Boolean = false,
)
