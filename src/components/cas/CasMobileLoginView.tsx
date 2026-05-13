import React, {useEffect, useState} from 'react';
import {WebView} from 'react-native-webview';
import {Linking} from 'react-native';
import {Platform} from 'react-native';
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
   document.getElementsByClassName('social-aut-login')[0].remove();
   const usernameElement = document.getElementById('mobileUsername');
   const passwordElement = document.getElementById('mobilePassword');
   usernameElement.addEventListener('change', () => {
        sendMessage(true, 'usernameChange', usernameElement.value, passwordElement.value);
   });
   
   passwordElement.addEventListener('change', () => {
        sendMessage(true, 'passwordChange', usernameElement.value, passwordElement.value);
   });
   const loginElement = document.getElementById('load');
   usernameElement.setAttribute('placeholder', ${JSON.stringify(
     studentIdPlaceholder,
   )});
   passwordElement.setAttribute('placeholder', ${JSON.stringify(
     passwordPlaceholder,
   )});
   loginElement.onclick = (e) => {
       if (usernameElement.value.length !== 13 && usernameElement.value.length !== 8) {
           showTips(${JSON.stringify(invalidStudentIdMessage)});
           return false;  
       }
       sendMessage(true, 'login', usernameElement.value, passwordElement.value);
       submitLoginForm(e);
   };
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
true;
`;

interface UserInfo {
  studentId?: string;
  password?: string;
}

const TAG = 'CasMobileLoginView';

function CasMobileLoginView(): React.JSX.Element {
  const {t} = useTranslation();
  useEffect(() => {
    CookieManager.clearAll(true).then(result => {
      Log.i(TAG, `clearCookie - ${result}`);
    });
  }, []);

  const [userInfo, setUserInfo] = useState<UserInfo>({});
  return (
    <WebView
      source={{
        uri: 'https://cas.whu.edu.cn/authserver/login?service=https%3A%2F%2Fcas.whu.edu.cn%2Fauthserver%2Fmobile%2Fcallback%3FappId%3D985180443&login_type=mobileLogin',
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
        const cookieHandler = (cookies: Cookies) => {
          if (
            (cookies.CASTGC?.value?.length ?? 0) > 0 &&
            (cookies.JSESSIONID?.value?.length ?? 0) > 0
          ) {
            const result = Object.keys(cookies)
              .map(key => `${key}=${cookies[key].value}`)
              .join(';');
            CasMobileLoginModule.onRequestSuccess(
              userInfo.studentId ?? '',
              userInfo.password ?? '',
              result,
            );
            Log.i(
              'CasMobileLoginView',
              `login cas - ${JSON.stringify(result)}`,
            );
          }
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
          CookieManager.get('https://cas.whu.edu.cn/authserver/').then(
            cookies => {
              cookieHandler(cookies);
            },
          );
        }

        if (
          request.url ===
          'https://homewh.chaoxing.com/agree/privacyPolicy?appId=1000028'
        ) {
          Linking.openURL(request.url).then(() => {});
          return false;
        }
        return true;
      }}
    />
  );
}

export default CasMobileLoginView;
