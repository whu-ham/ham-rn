import {WebView} from 'react-native-webview';
import React from 'react';
import {useWebViewStyle} from '@/components/cas/style';

/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/5/13 15:11
 */
const ReAuthLoginView = ({
  reAuthUrl,
  onGetTicketUrl,
  testID,
}: {
  reAuthUrl: string;
  onGetTicketUrl: (ticketUrl: string) => void;
  testID?: string;
}): React.ReactElement => {
  return (
    <WebView
      testID={testID}
      source={{uri: reAuthUrl}}
      style={useWebViewStyle()}
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
