package com.nowcent.ham.rndebug

import android.app.Activity
import android.app.Application
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.facebook.react.PackageList
import com.facebook.react.ReactDelegate
import com.facebook.react.ReactHost
import com.facebook.react.defaults.DefaultReactHost
import com.nowcent.ham.rndebug.module.RNCustomPackage

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/1/21 01:01
 */
private fun getHost(context: Context): ReactHost {
    return DefaultReactHost.getDefaultReactHost(
        context = context,
        packageList =  PackageList(context.applicationContext as Application).packages + RNCustomPackage(),
        useDevSupport = BuildConfig.DEBUG
    )
}

@Composable
fun RNContainer(
    moduleName: String,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val host = getHost(context)
    val delegate = remember {
        ReactDelegate(context as Activity, host, moduleName, null).also {
            it.loadApp(moduleName)
        }
    }

    DisposableEffect(Unit) {
        host.onHostResume(null)
        onDispose {
            host.onHostDestroy(null)
        }
    }

    AndroidView(
        factory = {
            delegate.reactRootView!!
        },
        modifier = modifier
    )
}
