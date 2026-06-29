package com.cofifinance.mobile.ui.auth.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.cofifinance.mobile.R
import com.cofifinance.mobile.ui.auth.components.EmailField
import com.cofifinance.mobile.ui.auth.components.PasswordField
import com.cofifinance.mobile.ui.auth.viewmodel.LoginViewModel

@Composable
fun LoginScreen(
    onAuthenticated: () -> Unit,
    onCreateAccount: () -> Unit,
    vm: LoginViewModel = hiltViewModel(),
) {
    val state by vm.ui.collectAsStateWithLifecycle()

    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) onAuthenticated()
    }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.login_title),
                style = MaterialTheme.typography.headlineMedium,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.login_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(32.dp))

            EmailField(
                value = state.email,
                onValueChange = vm::onEmailChange,
                errorRes = state.emailError,
                enabled = !state.isSubmitting,
            )
            Spacer(Modifier.height(12.dp))
            PasswordField(
                value = state.password,
                onValueChange = vm::onPasswordChange,
                errorRes = state.passwordError,
                enabled = !state.isSubmitting,
                onSubmit = vm::submit,
            )

            state.formError?.let { errorRes ->
                Spacer(Modifier.height(12.dp))
                Text(
                    text = stringResource(errorRes),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            Spacer(Modifier.height(24.dp))
            Button(
                onClick = vm::submit,
                enabled = !state.isSubmitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                } else {
                    Text(stringResource(R.string.login_submit))
                }
            }
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = onCreateAccount,
                enabled = !state.isSubmitting,
            ) {
                Text(stringResource(R.string.login_create_account))
            }
        }
    }
}
