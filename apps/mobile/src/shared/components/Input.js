"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = void 0;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const Input = ({ label, error, helperText, leftIcon, rightIcon, onRightIconPress, style, ...props }) => {
    const { theme } = (0, ThemeContext_1.useTheme)();
    const [isFocused, setIsFocused] = (0, react_1.useState)(false);
    const containerStyle = {
        marginBottom: theme.spacing.md,
    };
    const labelStyle = {
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.medium,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    };
    const inputContainerStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: error
            ? theme.colors.error
            : isFocused
                ? theme.colors.borderFocused
                : theme.colors.border,
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        minHeight: 48,
    };
    const inputStyle = {
        flex: 1,
        fontSize: theme.typography.sizes.md,
        color: theme.colors.text,
        paddingVertical: theme.spacing.sm,
    };
    const helperTextStyle = {
        fontSize: theme.typography.sizes.xs,
        color: error ? theme.colors.error : theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    };
    return (<react_native_1.View style={containerStyle}>
      {label && <react_native_1.Text style={labelStyle}>{label}</react_native_1.Text>}

      <react_native_1.View style={inputContainerStyle}>
        {leftIcon && <react_native_1.View style={{ marginRight: theme.spacing.sm }}>{leftIcon}</react_native_1.View>}

        <react_native_1.TextInput style={[inputStyle, style]} placeholderTextColor={theme.colors.textTertiary} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} {...props}/>

        {rightIcon && (<react_native_1.TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress} style={{ marginLeft: theme.spacing.sm }}>
            {rightIcon}
          </react_native_1.TouchableOpacity>)}
      </react_native_1.View>

      {(error || helperText) && (<react_native_1.Text style={helperTextStyle}>{error || helperText}</react_native_1.Text>)}
    </react_native_1.View>);
};
exports.Input = Input;
//# sourceMappingURL=Input.js.map