package com.nowcent.ham.rndebug

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.nowcent.ham.rndebug.component.cas.RNCasMobileLoginView
import com.nowcent.ham.rndebug.component.common.RNCommon
import com.nowcent.ham.rndebug.component.education.RNFetchCourseView
import com.nowcent.ham.rndebug.component.education.RNFetchScoreView
import com.nowcent.ham.rndebug.component.education.RNScoreCalcView

/**
 * The course-import state-machine branches, as (label, AppRegistry name) pairs.
 * Must stay in step with `scenarios` in src/e2e/courseImportEntries.tsx — a
 * scenario listed here but not registered there launches an empty container.
 */
private val E2E_SCENARIOS = listOf(
    "E2E Clean" to "RNFetchCourseViewE2EClean",
    "E2E AllFailed" to "RNFetchCourseViewE2EAllFailed",
    "E2E Empty" to "RNFetchCourseViewE2EEmpty",
    "E2E LoginFailed" to "RNFetchCourseViewE2ELoginFailed",
)

class HomeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            HomeView()
        }
    }
}

@Composable
private fun HomeView() {
    val navController = rememberNavController()
    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            NavHost(navController, "home") {
                composable("home") {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        item {
                            TextButton(onClick = {
                                navController.navigate("RNCasMobileLogin")
                            }) {
                                Text("CasMobileLoginView")
                            }
                        }

                        item {
                            TextButton(onClick = {
                                navController.navigate("RNFetchCourseView")
                            }) {
                                Text("RNFetchCourseView")
                            }
                        }

                        item {
                            TextButton(onClick = {
                                navController.navigate("RNFetchScoreView")
                            }) {
                                Text("RNFetchScoreView")
                            }
                        }

                        item {
                            TextButton(onClick = {
                                navController.navigate("RNScoreCalcView")
                            }) {
                                Text("RNScoreCalcView")
                            }
                        }

                        item {
                            TextButton(onClick = {
                                navController.navigate("RNCommon")
                            }) {
                                Text("RNCommon")
                            }
                        }

                        item {
                            TextButton(onClick = {
                                navController.navigate("RNFetchCourseViewE2E")
                            }) {
                                Text("RNFetchCourseViewE2E")
                            }
                        }

                        // One row per branch of the course-import state
                        // machine. The scenarios differ only in what the canned
                        // server returns, so a flow can only reach one by
                        // launching its own entry; see src/e2e/courseFixture.ts.
                        items(E2E_SCENARIOS) { (label, moduleName) ->
                            TextButton(onClick = {
                                navController.navigate(moduleName)
                            }) {
                                Text(label)
                            }
                        }
                    }
                }
                composable("RNCasMobileLogin") {
                    RNCasMobileLoginView()
                }
                composable("RNFetchCourseView") {
                    RNFetchCourseView()
                }
                composable("RNFetchScoreView") {
                    RNFetchScoreView()
                }
                composable("RNScoreCalcView") {
                    RNScoreCalcView()
                }
                composable("RNCommon") {
                    RNCommon()
                }
                composable("RNFetchCourseViewE2E") {
                    RNContainer("RNFetchCourseViewE2E")
                }
                // Every scenario shares one destination: the entry name is all
                // that distinguishes them, and the fixture inside the bundle is
                // what actually differs.
                E2E_SCENARIOS.forEach { (_, moduleName) ->
                    composable(moduleName) {
                        RNContainer(moduleName)
                    }
                }
            }
        }
    }
}
