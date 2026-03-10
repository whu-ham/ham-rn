package com.nowcent.ham.rndebug.module

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule
import com.nowcent.ham.rn.nativemodule.NativeEducationModuleSpec

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/1/21 01:25
 */
class RNEducationModule(reactContext: ReactApplicationContext) :
    NativeEducationModuleSpec(reactContext) {

    override fun onGetCourseList(
        courseList: ReadableArray?,
        courseGridEntity: ReadableArray?,
        errorMessage: String?
    ) {
        Log.i(
            "RNEducationModule",
            "onGetCourseList: courseList=$courseList, errorMessage=$errorMessage"
        )
    }

    override fun getCourseConfig(): WritableMap {
        Log.i("RNEducationModule", "getCourseConfig")
        return WritableNativeMap().apply {
            putInt("year", 2026)
            putInt("semester", 1)
        }
    }

    override fun onGetScoreList(scoreListStr: String, userInfoStr: String, errorMessage: String?) {
        Log.i(
            "RNEducationModule",
            "onGetScoreList: scoreListStr=$scoreListStr, userInfoStr=$userInfoStr, errorMessage=$errorMessage"
        )
    }
}
