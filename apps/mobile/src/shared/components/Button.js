"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const Button = ({ title, onPress, variant = 'primary', size = 'md', disabled = false, loading = false, fullWidth = false, style, textStyle, }) => {
    const { theme } = (0, ThemeContext_1.useTheme)();
    const getButtonStyle = () => {
        const baseStyle = {
            borderRadius: theme.borderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
        };
        // Size
        switch (size) {
            case 'sm':
                baseStyle.paddingVertical = theme.spacing.sm;
                baseStyle.paddingHorizontal = theme.spacing.md;
                break;
            case 'lg':
                baseStyle.paddingVertical = theme.spacing.lg;
                baseStyle.paddingHorizontal = theme.spacing.xl;
                break;
            default:
                baseStyle.paddingVertical = theme.spacing.md;
                baseStyle.paddingHorizontal = theme.spacing.lg;
        }
        // Variant
        switch (variant) {
            case 'primary':
                baseStyle.backgroundColor = theme.colors.primary;
                break;
            case 'secondary':
                baseStyle.backgroundColor = theme.colors.surface;
                baseStyle.borderWidth = 1;
                baseStyle.borderColor = theme.colors.border;
                break;
            case 'outline':
                baseStyle.backgroundColor = 'transparent';
                baseStyle.borderWidth = 2;
                baseStyle.borderColor = theme.colors.primary;
                break;
            case 'ghost':
                baseStyle.backgroundColor = 'transparent';
                break;
            case 'danger':
                baseStyle.backgroundColor = theme.colors.error;
                break;
        }
        // Disabled
        if (disabled || loading) {
            baseStyle.opacity = 0.5;
        }
        // Full width
        if (fullWidth) {
            baseStyle.width = '100%';
        }
        return baseStyle;
    };
    const getTextStyle = () => {
        const baseStyle = {
            fontWeight: theme.typography.weights.semibold,
        };
        // Size
        switch (size) {
            case 'sm':
                baseStyle.fontSize = theme.typography.sizes.sm;
                break;
            case 'lg':
                baseStyle.fontSize = theme.typography.sizes.lg;
                break;
            default:
                baseStyle.fontSize = theme.typography.sizes.md;
        }
        // Variant colors
        switch (variant) {
            case 'primary':
            case 'danger':
                baseStyle.color = '#FFFFFF';
                break;
            case 'secondary':
            case 'ghost':
                baseStyle.color = theme.colors.text;
                break;
            case 'outline':
                baseStyle.color = theme.colors.primary;
                break;
        }
        return baseStyle;
    };
    return (<react_native_1.TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[getButtonStyle(), style]} activeOpacity={0.7}>
      {loading ? (<react_native_1.ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.colors.primary}/>) : (<react_native_1.Text style={[getTextStyle(), textStyle]}>{title}</react_native_1.Text>)}
    </react_native_1.TouchableOpacity>);
};
exports.Button = Button;
//# sourceMappingURL=Button.js.map