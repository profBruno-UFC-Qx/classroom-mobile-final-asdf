package com.cofifinance.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = md_light_primary,
    onPrimary = md_light_onPrimary,
    secondary = md_light_secondary,
    background = md_light_background,
    surface = md_light_surface,
)

private val DarkColors = darkColorScheme(
    primary = md_dark_primary,
    onPrimary = md_dark_onPrimary,
    secondary = md_dark_secondary,
    background = md_dark_background,
    surface = md_dark_surface,
)

@Composable
fun CofiFinanceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = Typography,
        content = content,
    )
}
