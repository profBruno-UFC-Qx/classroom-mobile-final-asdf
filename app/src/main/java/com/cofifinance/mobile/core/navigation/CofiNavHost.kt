package com.cofifinance.mobile.core.navigation

import androidx.compose.runtime.Composable
import androidx.navigation3.runtime.entryProvider
import androidx.navigation3.runtime.rememberNavBackStack
import androidx.navigation3.ui.NavDisplay
import com.cofifinance.mobile.ui.auth.screens.LoginScreen
import com.cofifinance.mobile.ui.auth.screens.RegisterScreen
import com.cofifinance.mobile.ui.home.screens.HomeScreen

@Composable
fun CofiNavHost() {
    val backStack = rememberNavBackStack(Login)

    NavDisplay(
        backStack = backStack,
        onBack = { backStack.removeLastOrNull() },
        entryProvider = entryProvider {
            entry<Login> {
                LoginScreen(
                    onAuthenticated = {
                        backStack.clear()
                        backStack.add(Home)
                    },
                    onCreateAccount = {
                        backStack.add(Register)
                    },
                )
            }
            entry<Register> {
                RegisterScreen()
            }
            entry<Home> {
                HomeScreen()
            }
        },
    )
}
