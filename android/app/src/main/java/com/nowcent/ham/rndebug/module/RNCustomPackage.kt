package com.nowcent.ham.rndebug.module

import android.view.View
import com.facebook.react.BaseReactPackage
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager
import com.nowcent.ham.rn.nativemodule.NativeCasMobileLoginModuleSpec
import com.nowcent.ham.rn.nativemodule.NativeCasModuleSpec
import com.nowcent.ham.rn.nativemodule.NativeCommonModuleSpec
import com.nowcent.ham.rn.nativemodule.NativeEducationModuleSpec
import com.nowcent.ham.rn.nativemodule.NativeLogSpec
import com.nowcent.ham.rn.nativemodule.NativeScoreCalcModuleSpec

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/1/21 01:18
 */
class RNCustomPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            NativeCasMobileLoginModuleSpec.NAME -> RNCasMobileLoginModule(reactContext)
            NativeEducationModuleSpec.NAME -> RNEducationModule(reactContext)
            NativeCasModuleSpec.NAME -> RNCasModule(reactContext)
            NativeScoreCalcModuleSpec.NAME -> RNScoreCalcModule(reactContext)
            NativeCommonModuleSpec.NAME -> RNCommonModule(reactContext)
            NativeLogSpec.NAME -> RNLogModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        val moduleNameList = listOf(
            NativeCasMobileLoginModuleSpec.NAME,
            NativeEducationModuleSpec.NAME,
            NativeCasModuleSpec.NAME,
            NativeScoreCalcModuleSpec.NAME,
            NativeCommonModuleSpec.NAME,
            NativeLogSpec.NAME
        )
        moduleNameList.associateWith {
            ReactModuleInfo(
                name = it,
                className = it,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = true
            )
        }
    }
}
