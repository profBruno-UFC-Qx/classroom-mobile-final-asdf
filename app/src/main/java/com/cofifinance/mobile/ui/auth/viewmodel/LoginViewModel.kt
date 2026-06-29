package com.cofifinance.mobile.ui.auth.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cofifinance.mobile.R
import com.cofifinance.mobile.data.repository.AuthError
import com.cofifinance.mobile.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val repo: AuthRepository,
) : ViewModel() {

    private val _ui = MutableStateFlow(LoginUiState())
    val ui: StateFlow<LoginUiState> = _ui.asStateFlow()

    fun onEmailChange(value: String) {
        _ui.update { it.copy(email = value, emailError = null, formError = null) }
    }

    fun onPasswordChange(value: String) {
        _ui.update { it.copy(password = value, passwordError = null, formError = null) }
    }

    fun submit() {
        val state = _ui.value
        if (state.isSubmitting) return

        val emailError = if (state.email.isBlank()) R.string.login_error_email_blank else null
        val passwordError = if (state.password.length < 8) R.string.login_error_password_short else null
        if (emailError != null || passwordError != null) {
            _ui.update { it.copy(emailError = emailError, passwordError = passwordError) }
            return
        }

        _ui.update { it.copy(isSubmitting = true, formError = null) }
        viewModelScope.launch {
            val result = repo.login(state.email.trim(), state.password)
            result.fold(
                onSuccess = {
                    _ui.update { it.copy(isSubmitting = false, loggedIn = true) }
                },
                onFailure = { error ->
                    _ui.update { it.copy(isSubmitting = false, formError = error.toStringRes()) }
                },
            )
        }
    }

    private fun Throwable.toStringRes(): Int = when (this) {
        AuthError.InvalidCredentials -> R.string.login_error_invalid_credentials
        AuthError.EmailNotVerified -> R.string.login_error_email_not_verified
        else -> R.string.login_error_generic
    }
}
