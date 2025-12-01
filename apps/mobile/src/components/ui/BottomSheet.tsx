/**
 * BottomSheet Component - Production-ready bottom sheet modal
 *
 * Features:
 * - Built on @gorhom/bottom-sheet (industry standard)
 * - Smooth Reanimated v3 animations
 * - Keyboard-aware behavior
 * - Multiple snap points
 * - Backdrop with dismiss
 * - Custom handle styling
 * - Healthcare-optimized layouts
 * - Accessibility support
 */

import React, { useMemo, useCallback, forwardRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdropProps,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { useTheme } from '../../hooks/useTheme';

export interface BottomSheetProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  snapPoints?: string[] | number[];
  index?: number;
  enablePanDownToClose?: boolean;
  enableDismissOnClose?: boolean;
  backdropOpacity?: number;
  onClose?: () => void;
  scrollable?: boolean;
  headerRight?: React.ReactNode;
  footerComponent?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const BottomSheet = forwardRef<GorhomBottomSheet, BottomSheetProps>(
  (
    {
      children,
      title,
      subtitle,
      snapPoints = ['25%', '50%', '90%'],
      index = 1,
      enablePanDownToClose = true,
      enableDismissOnClose = true,
      backdropOpacity = 0.5,
      onClose,
      scrollable = false,
      headerRight,
      footerComponent,
      containerStyle,
    },
    ref
  ) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    // Memoize snap points to prevent re-renders
    const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={backdropOpacity}
          pressBehavior={enableDismissOnClose ? 'close' : 'none'}
        />
      ),
      [backdropOpacity, enableDismissOnClose]
    );

    // Handle sheet changes
    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1 && onClose) {
          onClose();
        }
      },
      [onClose]
    );

    const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <GorhomBottomSheet
        ref={ref}
        index={index}
        snapPoints={snapPointsMemo}
        onChange={handleSheetChanges}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handleIndicator}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        {/* Header */}
        {(title || subtitle || headerRight) && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
          </View>
        )}

        {/* Content */}
        <ContentWrapper
          style={[styles.contentContainer, containerStyle]}
          contentContainerStyle={scrollable ? styles.scrollContent : undefined}
        >
          {children}
        </ContentWrapper>

        {/* Footer */}
        {footerComponent && <View style={styles.footer}>{footerComponent}</View>}
      </GorhomBottomSheet>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

// Modal variant - for full overlay modals
export const BottomSheetModalComponent = forwardRef<BottomSheetModal, BottomSheetProps>(
  (
    {
      children,
      title,
      subtitle,
      snapPoints = ['50%', '90%'],
      enablePanDownToClose = true,
      enableDismissOnClose = true,
      backdropOpacity = 0.5,
      onClose,
      scrollable = false,
      headerRight,
      footerComponent,
      containerStyle,
    },
    ref
  ) => {
    const { theme } = useTheme();
    const styles = createStyles(theme);

    const snapPointsMemo = useMemo(() => snapPoints, [snapPoints]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={backdropOpacity}
          pressBehavior={enableDismissOnClose ? 'close' : 'none'}
        />
      ),
      [backdropOpacity, enableDismissOnClose]
    );

    const handleDismiss = useCallback(() => {
      if (onClose) {
        onClose();
      }
    }, [onClose]);

    const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPointsMemo}
        onDismiss={handleDismiss}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handleIndicator}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        {/* Header */}
        {(title || subtitle || headerRight) && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
            {onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content */}
        <ContentWrapper
          style={[styles.contentContainer, containerStyle]}
          contentContainerStyle={scrollable ? styles.scrollContent : undefined}
        >
          {children}
        </ContentWrapper>

        {/* Footer */}
        {footerComponent && <View style={styles.footer}>{footerComponent}</View>}
      </BottomSheetModal>
    );
  }
);

BottomSheetModalComponent.displayName = 'BottomSheetModal';

const createStyles = (theme: any) =>
  StyleSheet.create({
    background: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      ...theme.shadows.xl,
    },
    handleIndicator: {
      backgroundColor: theme.colors.border,
      width: 40,
      height: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerLeft: {
      flex: 1,
    },
    headerRight: {
      marginLeft: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      padding: 8,
      marginLeft: 12,
    },
    closeIcon: {
      fontSize: 20,
      color: theme.colors.textSecondary,
      fontWeight: '300',
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    scrollContent: {
      paddingBottom: 24,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
  });

// Preset bottom sheets for common healthcare use cases

// Action Sheet - Quick actions with icons
interface ActionSheetAction {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

export const ActionSheet = forwardRef<
  BottomSheetModal,
  Omit<BottomSheetProps, 'children'> & { actions: ActionSheetAction[] }
>(({ actions, ...props }, ref) => {
  const { theme } = useTheme();

  return (
    <BottomSheetModalComponent
      ref={ref}
      {...props}
      snapPoints={['30%']}
      scrollable={false}
    >
      <View style={{ paddingBottom: 16 }}>
        {actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              action.onPress();
              if (props.onClose) props.onClose();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 16,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: action.destructive
                ? `${theme.colors.error}15`
                : theme.colors.surfaceSecondary,
              marginBottom: 8,
            }}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={{ fontSize: 24, marginRight: 12 }}>{action.icon}</Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: action.destructive ? theme.colors.error : theme.colors.text,
              }}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheetModalComponent>
  );
});

ActionSheet.displayName = 'ActionSheet';

// Confirmation Sheet - Yes/No confirmations
interface ConfirmationSheetProps extends Omit<BottomSheetProps, 'children'> {
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export const ConfirmationSheet = forwardRef<BottomSheetModal, ConfirmationSheetProps>(
  (
    {
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      onConfirm,
      destructive = false,
      ...props
    },
    ref
  ) => {
    const { theme } = useTheme();

    return (
      <BottomSheetModalComponent
        ref={ref}
        {...props}
        snapPoints={['25%']}
        scrollable={false}
      >
        <View>
          <Text
            style={{
              fontSize: 16,
              color: theme.colors.text,
              marginBottom: 24,
              lineHeight: 24,
            }}
          >
            {message}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={props.onClose}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: theme.colors.surfaceSecondary,
                alignItems: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onConfirm();
                if (props.onClose) props.onClose();
              }}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: destructive ? theme.colors.error : theme.colors.primary,
                alignItems: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModalComponent>
    );
  }
);

ConfirmationSheet.displayName = 'ConfirmationSheet';
