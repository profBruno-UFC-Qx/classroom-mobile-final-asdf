package com.cofifinance.mobile.core.navigation

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable
data object Login : NavKey

@Serializable
data object Register : NavKey

@Serializable
data object Home : NavKey

@Serializable
data object Spending : NavKey
