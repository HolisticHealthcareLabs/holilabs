"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const ThemeContext_1 = require("@/shared/contexts/ThemeContext");
const Card = ({ children, style, padding = 'md', elevation = 'md', }) => {
    const { theme } = (0, ThemeContext_1.useTheme)();
    const getPadding = () => {
        switch (padding) {
            case 'none':
                return 0;
            case 'sm':
                return theme.spacing.sm;
            case 'lg':
                return theme.spacing.lg;
            default:
                return theme.spacing.md;
        }
    };
    const getElevation = () => {
        switch (elevation) {
            case 'none':
                return {};
            case 'sm':
                return theme.shadows.sm;
            case 'lg':
                return theme.shadows.lg;
            default:
                return theme.shadows.md;
        }
    };
    const cardStyle = {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: getPadding(),
        ...getElevation(),
    };
    return <react_native_1.View style={[cardStyle, style]}>{children}</react_native_1.View>;
};
exports.Card = Card;
//# sourceMappingURL=Card.js.map