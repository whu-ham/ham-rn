package com.nowcent.ham.rndebug

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
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
            }
        }
    }
}
