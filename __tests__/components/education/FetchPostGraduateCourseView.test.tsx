import React from 'react';
import {render, screen} from '@testing-library/react-native';
import FetchPostGraduateCourseView from '@/components/education/course/FetchPostGraduateCourseView';
import zh from '@/i18n/zh/translation.json';

/**
 * The postgraduate timetable import is not implemented yet: the screen is a
 * placeholder that the native course-settings sheet opens. These tests pin
 * down the two things that matter for a placeholder — that it renders without
 * touching native modules or the network, and that the message is translated
 * rather than hard-coded.
 */
describe('FetchPostGraduateCourseView', () => {
  it('renders the container', async () => {
    await render(<FetchPostGraduateCourseView />);
    expect(screen.getByTestId('fetch-post-graduate-course-view')).toBeTruthy();
  });

  it('shows the not-supported message', async () => {
    await render(<FetchPostGraduateCourseView />);
    expect(
      screen.getByTestId('fetch-post-graduate-course-view-message'),
    ).toHaveTextContent(zh.education.postgraduate_not_supported);
  });

  it('performs no native calls', async () => {
    await render(<FetchPostGraduateCourseView />);
    const {default: EducationModule} = jest.requireMock(
      '@/modules/NativeEducationModule',
    );
    expect(EducationModule.onGetCourseList).not.toHaveBeenCalled();
  });
});
