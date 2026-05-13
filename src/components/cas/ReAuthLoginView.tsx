import {WebView} from 'react-native-webview';
import React from 'react';
import {webViewStyle} from '@/components/cas/style';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/5/13 15:11
 */
const ReAuthLoginView = ({
  reAuthUrl,
  onGetTicketUrl,
}: {
  reAuthUrl: string;
  onGetTicketUrl: (ticketUrl: string) => void;
}): React.ReactElement => {
  return (
    <WebView
      source={{uri: reAuthUrl}}
      style={webViewStyle()}
      webviewDebuggingEnabled={false}
      onShouldStartLoadWithRequest={request => {
        if (request.url.indexOf('ticket') !== -1) {
          onGetTicketUrl(request.url);
          return false;
        }
        return true;
      }}
    />
  );
};

export {ReAuthLoginView};
