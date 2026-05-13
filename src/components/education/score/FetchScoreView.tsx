/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2024/7/16 00:39
 */
import React from 'react';
import '@/i18n/i18n';
import EducationModule from '@/modules/NativeEducationModule';
import {loginEducation} from '@/business/education';
import {getScoreList} from '@/business/education/score';
import {generateValidate} from '@/business/education/api';
import {getUserInfo} from '@/business/education/score/api';
import FetchEducationView from '@/components/education/FetchEducationView';

const FetchScoreView = (): React.ReactElement => {
  return (
    <FetchEducationView
      tag="FetchScoreView"
      doLoginAndFetch={doLoginAndGetScoreList}
      doFetch={doGetScoreList}
      onError={message => EducationModule.onGetScoreList('', '', message)}
    />
  );
};

const doLoginAndGetScoreList = async () => {
  await loginEducation();
  await doGetScoreList();
};

const doGetScoreList = async () => {
  const [scoreList, userInfo] = await getScoreList({
    validate: generateValidate(),
  });
  if (userInfo.studentId === '') {
    let {studentID} = await getUserInfo();
    userInfo.studentId = studentID;
  }
  const scoreListResult = JSON.stringify(scoreList);
  const userInfoResult = JSON.stringify(userInfo);
  EducationModule.onGetScoreList(scoreListResult, userInfoResult, null);
};

export default FetchScoreView;
