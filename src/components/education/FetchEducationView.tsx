/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/16
 */
import React, {useEffect, useState} from 'react';
import '@/i18n/i18n';
import type {StyleProp, TextStyle, ViewStyle} from 'react-native';
import {ActivityIndicator, Text, View} from 'react-native';
import Log from '@/modules/NativeLog';
import {CasReAuthLoginError} from '@/business/education/api';
import {useTranslation} from 'react-i18next';
import {ReAuthLoginView} from '@/components/cas/ReAuthLoginView';

export enum EducationStage {
  TRY_GET_INFO_DIRECTLY,
  REAUTH_LOGIN,
  LOAD_EDUCATION,
}

interface FetchEducationViewProps {
  tag: string;
  doLoginAndFetch: () => Promise<void>;
  doFetch: () => Promise<void>;
  onError: (message: string) => void;
}

const FetchEducationView = ({
  tag,
  doLoginAndFetch,
  doFetch,
  onError,
}: FetchEducationViewProps): React.ReactElement => {
  const {t} = useTranslation();
  const [reAuthUrl, setReAuthUrl] = useState('');
  const [stage, setStage] = useState(EducationStage.TRY_GET_INFO_DIRECTLY);

  useEffect(() => {
    if (stage !== EducationStage.TRY_GET_INFO_DIRECTLY) {
      return;
    }
    doLoginAndFetch().catch(err => {
      Log.e(tag, `doFetch - error! err=${JSON.stringify(err)}`);
      if (err instanceof CasReAuthLoginError) {
        setReAuthUrl(err.url);
        setStage(EducationStage.REAUTH_LOGIN);
      } else {
        onError(err.message);
      }
    });
  }, [stage]);

  if (stage === EducationStage.REAUTH_LOGIN) {
    return (
      <ReAuthLoginView
        reAuthUrl={reAuthUrl}
        onGetTicketUrl={ticketUrl => {
          fetch(ticketUrl)
            .then(() => {
              doFetch().catch(err => {
                onError(err.message);
              });
            })
            .catch((err: Error) => {
              Log.e(tag, `fetch ticketUrl - error! err=${err}`);
              onError(err.message);
            });
          setStage(EducationStage.LOAD_EDUCATION);
        }}
      />
    );
  }

  return (
    <View style={containerStyle}>
      <View style={loadingContainerStyle}>
        <ActivityIndicator size={'large'} />
        <Text style={loadingTextStyle}>{t('education.loading')}</Text>
      </View>
    </View>
  );
};

const containerStyle: StyleProp<ViewStyle> = {
  width: '100%',
  height: '100%',
};

const loadingContainerStyle: StyleProp<ViewStyle> = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
};

const loadingTextStyle: StyleProp<TextStyle> = {
  fontSize: 12,
};

export default FetchEducationView;
