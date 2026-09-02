import React, {useEffect, useRef, useState} from 'react';
import {WebView} from 'react-native-webview';
import {Linking, Platform} from 'react-native';
import CasMobileLoginModule from '@/modules/NativeCasMobileLoginModule';
import Log from '@/modules/NativeLog';
import '@/i18n/i18n';
import {useTranslation} from 'react-i18next';
import type {Cookies} from '@preeternal/react-native-cookie-manager';
import CookieManager from '@preeternal/react-native-cookie-manager';
import {useWebViewStyle} from '@/components/cas/style';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/15 18:10
 */

const buildInjectedScript = (
  studentIdPlaceholder: string,
  invalidStudentIdMessage: string,
  passwordPlaceholder: string,
  loginButtonText: string,
  rememberMeLabelText: string,
  agreeLabelText: string,
  privacyPolicyText: string,
  universityNameText: string,
  privacyAgreementTip: string,
  accountExpiredTip: string,
  invalidUsernamePasswordTip: string,
) => `
   function sendMessage(status, type, username, password) {
      const messageBody = { username, password, type };
      const event = {
          type: 'postMessage',
          data: messageBody
      }
      window.ReactNativeWebView.postMessage(JSON.stringify(event));
   };
   const socialAutoLoginElement = document.getElementsByClassName('social-aut-login')[0];
   if (socialAutoLoginElement) {
       socialAutoLoginElement.remove();
   }
   const combineOptionsFooter = document.getElementsByClassName('combine_options_footer')[0];
   if (combineOptionsFooter) {
       combineOptionsFooter.remove();
   }
   const usernameElement = document.getElementById('username');
   const passwordElement = document.getElementById('password');
   const loginElement = document.getElementById('login_submit');
   if (!usernameElement || !passwordElement || !loginElement) {
       true;
   } else {
   usernameElement.addEventListener('change', () => {
        sendMessage(true, 'usernameChange', usernameElement.value, passwordElement.value);
   });
   
   passwordElement.addEventListener('change', () => {
        sendMessage(true, 'passwordChange', usernameElement.value, passwordElement.value);
   });
   usernameElement.setAttribute('placeholder', ${JSON.stringify(
     studentIdPlaceholder,
   )});
   passwordElement.setAttribute('placeholder', ${JSON.stringify(
     passwordPlaceholder,
   )});
   loginElement.addEventListener('click', e => {
       if (usernameElement.value.length !== 13 && usernameElement.value.length !== 8) {
           e.preventDefault();
           e.stopImmediatePropagation();
           utils.alertBox(${JSON.stringify(invalidStudentIdMessage)});
           return;
       }
       sendMessage(true, 'login', usernameElement.value, passwordElement.value);
   }, true);
   if (loginElement) {
       const loginIcon = loginElement.querySelector('i');
       const loginIconClone = loginIcon ? loginIcon.cloneNode(true) : null;
       loginElement.textContent = '';
       if (loginIconClone) {
           loginElement.appendChild(loginIconClone);
       }
       loginElement.appendChild(document.createTextNode(' ' + ${JSON.stringify(
         loginButtonText,
       )}));
   }
   
   if (document.getElementsByClassName('main') && document.getElementsByClassName('main').length) {
       document.getElementsByClassName('main')[0].setAttribute('style', \`height: ${'$'}{window.innerHeight}px\`);
   }
   const rememberMeLabel = document.querySelector('label[for="rememberMe"]');
   if (rememberMeLabel) {
       rememberMeLabel.textContent = ${JSON.stringify(rememberMeLabelText)};
   }
   const forgetPasswordElement = document.getElementById('mobileGetPasswordControllerId');
   if (forgetPasswordElement) {
       forgetPasswordElement.style.display = 'none';
   }
   const retrievePassElement = document.getElementById('retrievePassId');
   if (retrievePassElement) {
       retrievePassElement.remove();
   }
   const agreeLabel = document.querySelector('label[for="isAgree"]');
   if (agreeLabel) {
       agreeLabel.textContent = ${JSON.stringify(agreeLabelText)};
   }
   const privacyPolicyLink = document.querySelector('.login-idx-opt a[href*="privacyPolicy"]');
   if (privacyPolicyLink) {
       privacyPolicyLink.textContent = ${JSON.stringify(privacyPolicyText)};
   }
   const languageWrap = document.getElementById('languages') || document.querySelector('.language-wrap');
   if (languageWrap) {
       languageWrap.style.display = 'none';
   }
   const headerElement = document.querySelector('header');
   if (headerElement) {
       headerElement.textContent = ${JSON.stringify(universityNameText)};
   }
   function extractShowTipsText(input) {
       if (typeof input === 'string') {
           return input.trim();
       }
       if (input && typeof input.textContent === 'string') {
           return input.textContent.trim();
       }
       if (input && typeof input.innerText === 'string') {
           return input.innerText.trim();
       }
       if (input && typeof input.innerHTML === 'string') {
           return input.innerHTML.replace(/<[^>]*>/g, '').trim();
       }
       return '';
   }
   function overrideShowTips() {
       if (typeof showTips !== 'function' || showTips.__hamWrapped) {
           return false;
       }
       const originalShowTips = showTips;
       const wrappedShowTips = (input) => {
           const text = extractShowTipsText(input);
           if (text === '请先阅读并同意隐私协议!') {
               originalShowTips(${JSON.stringify(privacyAgreementTip)});
               return;
           }
           if (text.includes('该帐号已经过期')) {
               originalShowTips(${JSON.stringify(accountExpiredTip)});
               return;
           }
           if (text.includes('您提供的用户名或者密码有误')) {
               originalShowTips(${JSON.stringify(invalidUsernamePasswordTip)});
               return;
           }
           originalShowTips(typeof input === 'string' ? input : text);
       };
       wrappedShowTips.__hamWrapped = true;
       showTips = wrappedShowTips;
       return true;
   }
   if (!overrideShowTips()) {
       const interval = setInterval(() => {
           if (overrideShowTips()) {
               clearInterval(interval);
           }
       }, 200);
       setTimeout(() => clearInterval(interval), 2000);
   }
   }
true;
`;

interface UserInfo {
  studentId?: string;
  password?: string;
}

const TAG = 'CasMobileLoginView';
const CAS_AUTH_SERVER = 'https://cas.whu.edu.cn/authserver';
const CAS_MOBILE_LOGIN_URL = `${CAS_AUTH_SERVER}/mobile/auth?appId=985180443`;
const CAS_MOBILE_SUCCESS_PATH = '/mobile/default.html';
const PRIVACY_POLICY_URL =
  'https://homewh.chaoxing.com/agree/privacyPolicy?appId=1000028';

const decodeUrl = (url: string) => {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
};

const extractMobileToken = (url: string) => {
  const decodedUrl = decodeUrl(url);
  if (!decodedUrl.includes(CAS_MOBILE_SUCCESS_PATH)) {
    return undefined;
  }

  const tokenParts = decodedUrl.split('mobile_token=', 2);
  return tokenParts.length > 1 && tokenParts[1].length > 0
    ? tokenParts[1]
    : undefined;
};

const buildCookieHeader = (cookies: Cookies) =>
  Object.keys(cookies)
    .map(key => `${key}=${cookies[key].value}`)
    .join(';');

function CasMobileLoginView(): React.JSX.Element {
  const {t} = useTranslation();
  const isLoginRef = useRef(false);

  useEffect(() => {
    CookieManager.clearAll(true).then(result => {
      Log.i(TAG, `clearCookie - ${result}`);
    });
  }, []);

  const [userInfo, setUserInfo] = useState<UserInfo>({});
  return (
    <WebView
      source={{
        uri: CAS_MOBILE_LOGIN_URL,
      }}
      injectedJavaScript={buildInjectedScript(
        t('cas.student_id_placeholder'),
        t('cas.invalid_student_id'),
        t('cas.password_placeholder'),
        t('cas.login_button'),
        t('cas.remember_me'),
        t('cas.agree_prefix'),
        t('cas.privacy_policy'),
        t('cas.university_name'),
        t('cas.privacy_agreement_tip'),
        t('cas.account_expired_tip'),
        t('cas.invalid_username_or_password_tip'),
      )}
      style={useWebViewStyle()}
      webviewDebuggingEnabled={false}
      onMessage={message => {
        const event: {
          type: string;
          data: {username: string; password: string};
        } = JSON.parse(message.nativeEvent.data);
        if (event.type === 'postMessage') {
          const {username, password} = event.data;
          setUserInfo({
            studentId: username,
            password,
          });
        }
      }}
      onShouldStartLoadWithRequest={request => {
        const mobileToken = extractMobileToken(request.url);
        if (mobileToken && !isLoginRef.current) {
          isLoginRef.current = true;

          const cookieHandler = (cookies: Cookies) => {
            const cookie = buildCookieHeader(cookies);
            CasMobileLoginModule.onRequestSuccess(
              userInfo.studentId ?? '',
              userInfo.password ?? '',
              cookie,
            );
            Log.i(TAG, `login cas mobile_token - ${mobileToken}`);
            Log.i(TAG, `login cas cookie - ${JSON.stringify(cookie)}`);
          };

          if (Platform.OS === 'ios') {
            CookieManager.getAll(true).then(allCookie => {
              const cookie: Cookies = {};
              Object.keys(allCookie)
                .filter(key => allCookie[key].domain === 'cas.whu.edu.cn')
                .forEach(key => {
                  cookie[key] = allCookie[key];
                });
              cookieHandler(cookie);
            });
          } else if (Platform.OS === 'android') {
            CookieManager.get(CAS_AUTH_SERVER).then(cookies => {
              cookieHandler(cookies);
            });
          }
          return false;
        }

        if (request.url === PRIVACY_POLICY_URL) {
          Linking.openURL(request.url).then(() => {});
          return false;
        }
        return true;
      }}
    />
  );
}

export default CasMobileLoginView;
