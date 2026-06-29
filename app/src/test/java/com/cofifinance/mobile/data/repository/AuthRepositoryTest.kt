package com.cofifinance.mobile.data.repository

import com.cofifinance.mobile.core.session.AuthState
import com.cofifinance.mobile.core.session.SessionManager
import com.cofifinance.mobile.core.session.TokenStore
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.LoginRequest
import com.cofifinance.mobile.data.remote.dto.RegisterRequest
import com.cofifinance.mobile.data.remote.dto.TokenPairDto
import com.cofifinance.mobile.core.session.TokenPair
import com.cofifinance.mobile.data.remote.dto.RenewRequest
import com.cofifinance.mobile.support.FakeAuthApiService
import com.cofifinance.mobile.support.InMemoryPreferencesDataStore
import com.cofifinance.mobile.support.errorResponse
import com.cofifinance.mobile.support.httpException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class AuthRepositoryTest {

    private lateinit var api: FakeAuthApiService
    private lateinit var session: SessionManager
    private lateinit var repo: AuthRepository

    @Before
    fun setUp() {
        api = FakeAuthApiService()
        val tokenStore = TokenStore(InMemoryPreferencesDataStore())
        session = SessionManager(tokenStore)
        repo = AuthRepository(api, session)
    }

    @Test
    fun `login forwards email and password verbatim`() = runTest {
        api.loginHandler = { ApiEnvelope(TokenPairDto("at", "rt")) }

        repo.login("lucas@mail.com", "asdfasdf")

        assertEquals(listOf(LoginRequest("lucas@mail.com", "asdfasdf")), api.loginCalls)
    }

    @Test
    fun `login on success unwraps data, persists tokens, and reaches Authenticated`() = runTest {
        api.loginHandler = { ApiEnvelope(TokenPairDto("at", "rt")) }

        val result = repo.login("lucas@mail.com", "asdfasdf")

        assertTrue(result.isSuccess)
        // Wait for the DataStore write to propagate through SessionManager's bootstrap collector.
        val state = session.state.first { it is AuthState.Authenticated } as AuthState.Authenticated
        assertEquals("at", state.tokens.accessToken)
        assertEquals("rt", state.tokens.refreshToken)
        assertEquals("at", session.currentAccessToken())
        assertEquals("rt", session.currentRefreshToken())
    }

    @Test
    fun `login maps HttpException 401 to InvalidCredentials`() = runTest {
        api.loginHandler = { throw httpException(401) }

        val result = repo.login("lucas@mail.com", "asdfasdf")

        assertSame(AuthError.InvalidCredentials, result.exceptionOrNull())
    }

    @Test
    fun `login maps HttpException 400 403 409 to typed AuthErrors and other codes to Unknown`() = runTest {
        val cases = mapOf(
            400 to AuthError.InvalidInput,
            403 to AuthError.EmailNotVerified,
            409 to AuthError.EmailAlreadyInUse,
        )
        for ((code, expected) in cases) {
            api.loginHandler = { throw httpException(code) }
            val result = repo.login("lucas@mail.com", "asdfasdf")
            assertSame("HTTP $code should map to $expected", expected, result.exceptionOrNull())
        }

        api.loginHandler = { throw httpException(500) }
        val unknown = repo.login("lucas@mail.com", "asdfasdf").exceptionOrNull()
        assertTrue(unknown is AuthError.Unknown)
        assertTrue((unknown as AuthError.Unknown).cause0 is retrofit2.HttpException)
    }

    @Test
    fun `login wraps non-HTTP throwables in AuthError Unknown`() = runTest {
        val boom = IllegalStateException("boom")
        api.loginHandler = { throw boom }

        val result = repo.login("lucas@mail.com", "asdfasdf")
        val error = result.exceptionOrNull()

        assertTrue(error is AuthError.Unknown)
        assertSame(boom, (error as AuthError.Unknown).cause0)
    }

    @Test
    fun `register on 2xx returns success`() = runTest {
        api.registerHandler = { retrofit2.Response.success(null) }

        val result = repo.register("lucas@mail.com", "asdfasdf")

        assertTrue(result.isSuccess)
        assertEquals(listOf(RegisterRequest("lucas@mail.com", "asdfasdf")), api.registerCalls)
    }

    @Test
    fun `register maps 409 to EmailAlreadyInUse`() = runTest {
        api.registerHandler = { errorResponse(409) }

        val result = repo.register("lucas@mail.com", "asdfasdf")

        assertSame(AuthError.EmailAlreadyInUse, result.exceptionOrNull())
    }

    @Test
    fun `logout clears the session`() = runTest {
        // Seed an authenticated state, then wait for SessionManager to observe it.
        session.onTokensIssued(TokenPair("at", "rt"))
        session.state.first { it is AuthState.Authenticated }
        assertNotNull(session.currentRefreshToken())

        val result = repo.logout()

        assertTrue(result.isSuccess)
        session.state.first { it is AuthState.Unauthenticated }
        assertNull(session.currentAccessToken())
        assertEquals(listOf(RenewRequest("rt")), api.logoutCalls)
    }
}
