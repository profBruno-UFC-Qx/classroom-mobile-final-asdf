package com.cofifinance.mobile.data.repository

import com.cofifinance.mobile.core.session.AuthState
import com.cofifinance.mobile.core.session.SessionManager
import com.cofifinance.mobile.data.remote.api.AuthApiService
import com.cofifinance.mobile.data.remote.dto.LoginRequest
import com.cofifinance.mobile.data.remote.dto.RegisterRequest
import com.cofifinance.mobile.data.remote.dto.RenewRequest
import kotlinx.coroutines.flow.StateFlow
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: AuthApiService,
    private val session: SessionManager,
) {

    val authState: StateFlow<AuthState> get() = session.state

    suspend fun login(email: String, password: String): Result<Unit> = runCatching {
        val pair = api.login(LoginRequest(email, password)).data.toDomain()
        session.onTokensIssued(pair)
    }.mapHttpError()

    suspend fun register(email: String, password: String): Result<Unit> = runCatching {
        val resp = api.register(RegisterRequest(email, password))
        if (!resp.isSuccessful) throw HttpException(resp)
    }.mapHttpError()

    suspend fun logout(): Result<Unit> = runCatching {
        val refresh = session.currentRefreshToken()
        val body = refresh?.let { RenewRequest(it) }
        api.logout(body)
        session.onLogout()
    }.mapHttpError()
}

private fun Result<Unit>.mapHttpError(): Result<Unit> =
    fold(
        onSuccess = { Result.success(Unit) },
        onFailure = { Result.failure(it.toAuthError()) },
    )

private fun Throwable.toAuthError(): AuthError = when (this) {
    is HttpException -> when (code()) {
        400 -> AuthError.InvalidInput
        401 -> AuthError.InvalidCredentials
        403 -> AuthError.EmailNotVerified
        409 -> AuthError.EmailAlreadyInUse
        else -> AuthError.Unknown(this)
    }
    is AuthError -> this
    else -> AuthError.Unknown(this)
}
