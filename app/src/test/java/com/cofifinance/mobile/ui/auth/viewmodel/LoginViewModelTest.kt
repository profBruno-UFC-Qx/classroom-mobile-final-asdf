package com.cofifinance.mobile.ui.auth.viewmodel

import com.cofifinance.mobile.R
import com.cofifinance.mobile.core.session.SessionManager
import com.cofifinance.mobile.core.session.TokenStore
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.TokenPairDto
import com.cofifinance.mobile.data.repository.AuthRepository
import com.cofifinance.mobile.support.FakeAuthApiService
import com.cofifinance.mobile.support.InMemoryPreferencesDataStore
import com.cofifinance.mobile.support.MainDispatcherRule
import com.cofifinance.mobile.support.httpException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var api: FakeAuthApiService
    private lateinit var session: SessionManager
    private lateinit var repo: AuthRepository
    private lateinit var vm: LoginViewModel

    @Before
    fun setUp() {
        api = FakeAuthApiService()
        session = SessionManager(TokenStore(InMemoryPreferencesDataStore()))
        repo = AuthRepository(api, session)
        vm = LoginViewModel(repo)
    }

    @Test
    fun `initial state is empty`() {
        assertEquals(LoginUiState(), vm.ui.value)
    }

    @Test
    fun `onEmailChange clears emailError and formError`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        // Trigger an emailError via blank submit.
        vm.submit()
        runCurrent()
        assertEquals(R.string.login_error_email_blank, vm.ui.value.emailError)

        vm.onEmailChange("lucas@mail.com")

        assertEquals("lucas@mail.com", vm.ui.value.email)
        assertNull(vm.ui.value.emailError)
        assertNull(vm.ui.value.formError)
    }

    @Test
    fun `onPasswordChange clears passwordError and formError`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        vm.onEmailChange("lucas@mail.com")
        vm.onPasswordChange("short")
        vm.submit()
        runCurrent()
        assertEquals(R.string.login_error_password_short, vm.ui.value.passwordError)

        vm.onPasswordChange("longenough")

        assertEquals("longenough", vm.ui.value.password)
        assertNull(vm.ui.value.passwordError)
        assertNull(vm.ui.value.formError)
    }

    @Test
    fun `submit with blank email surfaces email blank error and does not call the API`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        vm.onPasswordChange("asdfasdf")

        vm.submit()
        advanceUntilIdle()

        assertEquals(R.string.login_error_email_blank, vm.ui.value.emailError)
        assertFalse(vm.ui.value.isSubmitting)
        assertTrue(api.loginCalls.isEmpty())
    }

    @Test
    fun `submit with 7-char password surfaces password short error and does not call the API`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        vm.onEmailChange("lucas@mail.com")
        vm.onPasswordChange("1234567")

        vm.submit()
        advanceUntilIdle()

        assertEquals(R.string.login_error_password_short, vm.ui.value.passwordError)
        assertFalse(vm.ui.value.isSubmitting)
        assertTrue(api.loginCalls.isEmpty())
    }

    @Test
    fun `submit happy path flips isSubmitting then loggedIn`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val gate = CompletableDeferred<ApiEnvelope<TokenPairDto>>()
        api.loginHandler = { gate.await() }
        vm.onEmailChange("lucas@mail.com")
        vm.onPasswordChange("asdfasdf")

        vm.submit()
        runCurrent()

        assertTrue("expected isSubmitting=true while API in flight", vm.ui.value.isSubmitting)
        assertFalse(vm.ui.value.loggedIn)

        gate.complete(ApiEnvelope(TokenPairDto("at", "rt")))
        advanceUntilIdle()

        assertFalse(vm.ui.value.isSubmitting)
        assertTrue(vm.ui.value.loggedIn)
        assertNull(vm.ui.value.formError)
    }

    @Test
    fun `submit on 401 surfaces invalid credentials and keeps loggedIn false`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        api.loginHandler = { throw httpException(401) }
        vm.onEmailChange("lucas@mail.com")
        vm.onPasswordChange("asdfasdf")

        vm.submit()
        advanceUntilIdle()

        assertEquals(R.string.login_error_invalid_credentials, vm.ui.value.formError)
        assertFalse(vm.ui.value.loggedIn)
        assertFalse(vm.ui.value.isSubmitting)
    }

    @Test
    fun `submit on 403 surfaces email not verified`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        api.loginHandler = { throw httpException(403) }
        vm.onEmailChange("lucas@mail.com")
        vm.onPasswordChange("asdfasdf")

        vm.submit()
        advanceUntilIdle()

        assertEquals(R.string.login_error_email_not_verified, vm.ui.value.formError)
    }

    @Test
    fun `submit on 500 surfaces generic error`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        api.loginHandler = { throw httpException(500) }
        vm.onEmailChange("lucas@mail.com")
        vm.onPasswordChange("asdfasdf")

        vm.submit()
        advanceUntilIdle()

        assertEquals(R.string.login_error_generic, vm.ui.value.formError)
    }

    @Test
    fun `submit while already submitting is a no-op`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val gate = CompletableDeferred<ApiEnvelope<TokenPairDto>>()
        api.loginHandler = { gate.await() }
        vm.onEmailChange("lucas@mail.com")
        vm.onPasswordChange("asdfasdf")

        vm.submit()
        runCurrent()
        vm.submit()
        runCurrent()

        gate.complete(ApiEnvelope(TokenPairDto("at", "rt")))
        advanceUntilIdle()

        assertEquals(1, api.loginCalls.size)
    }

    @Test
    fun `submit trims the email before sending`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        api.loginHandler = { ApiEnvelope(TokenPairDto("at", "rt")) }
        vm.onEmailChange("  lucas@mail.com  ")
        vm.onPasswordChange("asdfasdf")

        vm.submit()
        advanceUntilIdle()

        assertEquals("lucas@mail.com", api.loginCalls.single().email)
    }
}
