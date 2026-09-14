/**
 * @author orangeboyChen
 * @version 1.0
 * @date 2026/9/14
 */
import React from 'react';
import '@/i18n/i18n';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Color from 'color';
import {useTranslation} from 'react-i18next';
import type {CourseEntity} from '@/business/education/course';
import {useColor} from '@/utils/color/color';

/**
 * Blocks the import until the user acknowledges the courses the parser could
 * not place on the timetable. Importing without asking would silently shrink
 * the timetable, which reads as "the semester has no such course" rather than
 * "the app failed to read it".
 */
const IgnoredCourseDialog = ({
  courses,
  onConfirm,
  onCancel,
  testID,
}: {
  courses: CourseEntity[];
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}): React.ReactElement => {
  const {t} = useTranslation();
  const color = useColor();

  return (
    <View
      testID={testID}
      style={[
        styles.overlay,
        {backgroundColor: Color(color.ham_text_primary).alpha(0.45).hexa()},
      ]}>
      <View
        testID={testID ? `${testID}-card` : undefined}
        style={[styles.card, {backgroundColor: color.ham_bg_b2}]}>
        <Text
          testID={testID ? `${testID}-title` : undefined}
          style={[styles.title, {color: color.ham_text_primary}]}>
          {t('education.ignored_course_title')}
        </Text>
        <Text
          testID={testID ? `${testID}-summary` : undefined}
          style={[styles.summary, {color: color.ham_text_secondary}]}>
          {t('education.ignored_course_summary', {count: courses.length})}
        </Text>

        <ScrollView
          testID={testID ? `${testID}-list` : undefined}
          style={styles.list}
          nestedScrollEnabled>
          {courses.map((course, index) => (
            <View
              key={`${course.courseId}-${index}`}
              testID={testID ? `${testID}-item-${index}` : undefined}
              style={styles.item}>
              <Text
                testID={testID ? `${testID}-item-name-${index}` : undefined}
                style={[styles.itemName, {color: color.ham_text_primary}]}>
                {course.name ||
                  course.courseId ||
                  t('education.unnamed_course')}
              </Text>
              {course.name !== '' && course.courseId !== '' ? (
                <Text
                  testID={testID ? `${testID}-item-id-${index}` : undefined}
                  style={[styles.itemId, {color: color.ham_text_secondary}]}>
                  {course.courseId}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            testID={testID ? `${testID}-cancel` : undefined}
            style={styles.button}
            onPress={onCancel}>
            <Text
              style={[styles.cancelText, {color: color.ham_text_secondary}]}>
              {t('education.ignored_course_cancel')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID={testID ? `${testID}-confirm` : undefined}
            style={styles.button}
            onPress={onConfirm}>
            <Text style={[styles.confirmText, {color: color.ham_blue}]}>
              {t('education.ignored_course_import')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flexGrow: 1,
    paddingVertical: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelText: {
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    maxHeight: '80%',
    padding: 20,
    width: '85%',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
  },
  item: {
    paddingVertical: 4,
  },
  itemId: {
    fontSize: 12,
  },
  itemName: {
    fontSize: 14,
  },
  list: {
    marginBottom: 8,
    marginTop: 12,
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  summary: {
    fontSize: 13,
    marginTop: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
});

export default IgnoredCourseDialog;
