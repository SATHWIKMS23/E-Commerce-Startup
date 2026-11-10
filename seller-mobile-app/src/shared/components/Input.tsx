import React, { forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '@/theme/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | boolean;
  errorMessage?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      errorMessage,
      containerStyle,
      inputStyle,
      icon,
      rightElement,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const errText = typeof error === 'string' ? error : errorMessage;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <View
          style={[
            styles.inputWrapper,
            hasError && styles.inputError,
            props.multiline && styles.multilineWrapper,
          ]}
        >
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <TextInput
            ref={ref as any}
            placeholderTextColor={Colors.textFaint}
            style={[styles.input, inputStyle]}
            selectionColor={Colors.purple}
            {...props}
          />
          {rightElement ? (
            <View style={styles.rightElement}>{rightElement}</View>
          ) : null}
        </View>
        {errText ? <Text style={styles.errorText}>{errText}</Text> : null}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  multilineWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 80,
  },
  inputError: {
    borderColor: Colors.rose,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    paddingVertical: 8,
  },
  iconContainer: {
    marginRight: 8,
  },
  rightElement: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 10,
    color: Colors.rose,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
});
