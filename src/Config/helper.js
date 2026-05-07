import { Dimensions, PixelRatio, Platform, StyleSheet } from "react-native";

// Base dimensions (based on standard mobile design - iPhone 11)
const baseWidth = 375;
const baseHeight = 812;

// Get initial screen dimensions
let { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Update dimensions on orientation change
Dimensions.addEventListener("change", ({ window }) => {
    SCREEN_WIDTH = window.width;
    SCREEN_HEIGHT = window.height;
});

// Get current screen dimensions (useful for components that need live values)
export const getScreenDimensions = () => {
    const { width, height } = Dimensions.get("window");
    return { width, height };
};

// Check if device is a tablet
export const isTablet = () => {
    const { width, height } = Dimensions.get("window");
    const aspectRatio = height / width;
    return Math.min(width, height) >= 600 && aspectRatio < 1.6;
};

// Responsive font size with min/max limits to prevent extreme scaling
export const responsiveFontSize = (baseFontSize, options = {}) => {
    const {
        minSize = baseFontSize * 0.8, // Minimum 80% of base
        maxSize = baseFontSize * 1.3, // Maximum 130% of base
        factor = 0.5, // Scaling factor (0-1, lower = less aggressive scaling)
    } = options;

    const { width } = Dimensions.get("window");
    const scale = width / baseWidth;

    // Use moderate scaling to prevent extreme sizes
    const moderatedScale = 1 + (scale - 1) * factor;
    const newSize = baseFontSize * moderatedScale;

    // Clamp between min and max
    const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));

    return Math.round(PixelRatio.roundToNearestPixel(clampedSize));
};

// Width percentage - converts percentage to actual width
export const wp = percentage => {
    const { width } = Dimensions.get("window");
    return PixelRatio.roundToNearestPixel((width * percentage) / 100);
};

// Height percentage - converts percentage to actual height
export const hp = percentage => {
    const { height } = Dimensions.get("window");
    return PixelRatio.roundToNearestPixel((height * percentage) / 100);
};

// Moderate scale - for elements that should scale moderately (icons, padding, margins)
export const moderateScale = (size, factor = 0.5) => {
    const { width } = Dimensions.get("window");
    const scale = width / baseWidth;
    return Math.round(
        PixelRatio.roundToNearestPixel(size + (scale - 1) * size * factor),
    );
};

// Vertical scale - scales based on height (useful for vertical spacing)
export const verticalScale = size => {
    const { height } = Dimensions.get("window");
    return Math.round(
        PixelRatio.roundToNearestPixel((height / baseHeight) * size),
    );
};

// Horizontal scale - scales based on width
export const horizontalScale = size => {
    const { width } = Dimensions.get("window");
    return Math.round(
        PixelRatio.roundToNearestPixel((width / baseWidth) * size),
    );
};

// Normalize font size across platforms
export const normalize = size => {
    const { width } = Dimensions.get("window");
    const scale = width / baseWidth;

    const newSize = size * scale;

    if (Platform.OS === "ios") {
        return Math.round(PixelRatio.roundToNearestPixel(newSize));
    }

    // Android needs slightly different handling
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
};

// Alias functions for backward compatibility
export const responsiveSize = moderateScale;

// Screen dimensions helper
export const screenDimensions = {
    get width() {
        return Dimensions.get("window").width;
    },
    get height() {
        return Dimensions.get("window").height;
    },
};

// Border widths scale
export const borderWidths = {
    none: 0,
    hairline: StyleSheet.hairlineWidth,
    thin: 0.5,
    normal: 1,
    medium: 1.5,
    thick: 2,
    heavy: 3,
};

// Icon sizes scale
export const iconSizes = {
    xs: moderateScale(12),
    sm: moderateScale(16),
    md: moderateScale(20),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
};

// Radius alias for backward compatibility
export const radius = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 9999,
    full: "50%",
};

// Font family names (without .ttf extension for React Native)
export const customFonts = {
    poppinsBlack: "Poppins-Black",
    poppinsRegular: "Poppins-Regular",
    poppinsThin: "Poppins-Thin",
    poppinsMedium: "Poppins-Medium",
    poppinsSemiBold: "Poppins-SemiBold",
    poppinsBold: "Poppins-Bold",
    poppinsLight: "Poppins-Light",
    poppinsItalic: "Poppins-Italic",
    poppinsExtraBold: "Poppins-ExtraBold",
    poppinsExtraLight: "Poppins-ExtraLight",
};

export const customColors = {
    // Primary colors
    primary: "#2196F3",
    primaryLight: "#64B5F6",
    primaryDark: "#1976D2",
    primaryFaded: "rgba(33, 150, 243, 0.1)",

    // Secondary colors
    secondary: "#FFC107",
    secondaryLight: "#FFD54F",
    secondaryDark: "#FFA000",
    secondaryFaded: "rgba(255, 193, 7, 0.1)",

    // Accent colors
    accent: "#FF4081",
    accent1: "#FF80AB",
    accent2: "#F50057",

    // Status colors
    success: "#4CAF50",
    successLight: "#81C784",
    successDark: "#388E3C",
    successFaded: "rgba(76, 175, 80, 0.1)",

    error: "#F44336",
    errorLight: "#E57373",
    errorDark: "#D32F2F",
    errorFaded: "rgba(244, 67, 54, 0.1)",

    warning: "#FF9800",
    warningLight: "#FFB74D",
    warningDark: "#F57C00",
    warningFaded: "rgba(255, 152, 0, 0.1)",

    info: "#2196F3",
    infoLight: "#64B5F6",
    infoDark: "#1976D2",
    infoFaded: "rgba(33, 150, 243, 0.1)",

    // Neutral colors
    black: "#000000",
    white: "#FFFFFF",
    background: "#F5F5F5",
    surface: "#FFFFFF",
    disabled: "#BDBDBD",
    placeholder: "#9E9E9E",
    divider: "#E0E0E0",

    border: "#EEEEEE",
    borderFocused: "#2196F3",

    // Text colors
    textPrimary: "#212121",
    textSecondary: "#757575",
    textDisabled: "#9E9E9E",
    textInverse: "#FFFFFF",
    textHint: "#BDBDBD",

    // Grey scale
    grey50: "#FAFAFA",
    grey100: "#F5F5F5",
    grey200: "#EEEEEE",
    grey300: "#E0E0E0",
    grey400: "#BDBDBD",
    grey500: "#9E9E9E",
    grey600: "#757575",
    grey700: "#616161",
    grey800: "#424242",
    grey900: "#212121",

    // Overlay colors
    overlay: "rgba(0, 0, 0, 0.5)",
    overlayLight: "rgba(0, 0, 0, 0.3)",
    overlayDark: "rgba(0, 0, 0, 0.7)",

    // Transparent
    transparent: "transparent",
};

export const typography = {
    // Headings
    h1: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(32),
        lineHeight: responsiveFontSize(40),
        color: customColors.textPrimary,
    }),
    h2: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(28),
        lineHeight: responsiveFontSize(36),
        color: customColors.textPrimary,
    }),
    h3: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(24),
        lineHeight: responsiveFontSize(32),
        color: customColors.textPrimary,
    }),
    h4: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(20),
        lineHeight: responsiveFontSize(28),
        color: customColors.textPrimary,
    }),
    h5: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(18),
        lineHeight: responsiveFontSize(24),
        color: customColors.textPrimary,
    }),
    h6: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
        color: customColors.textPrimary,
    }),

    // Subtitles
    subtitle1: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
        color: customColors.textPrimary,
    }),
    subtitle2: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        color: customColors.textSecondary,
    }),

    // Body text
    body1: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
        color: customColors.textPrimary,
    }),
    body2: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        color: customColors.textPrimary,
    }),

    // Button text
    button: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        textTransform: "uppercase",
        letterSpacing: 0.5,
    }),
    buttonSmall: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
        textTransform: "uppercase",
        letterSpacing: 0.4,
    }),
    buttonLarge: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
        textTransform: "uppercase",
        letterSpacing: 0.5,
    }),

    // Caption and small text
    caption: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
        color: customColors.textSecondary,
    }),
    overline: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(10),
        lineHeight: responsiveFontSize(14),
        letterSpacing: 1.5,
        textTransform: "uppercase",
        color: customColors.textSecondary,
    }),

    // Table styles
    table: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        color: customColors.grey700,
    }),
    tableHeader: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        color: customColors.grey900,
    }),
    tableCell: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(13),
        lineHeight: responsiveFontSize(18),
        color: customColors.textPrimary,
    }),
    label: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        letterSpacing: 0.1,
        color: customColors.grey700,
    }),

    // Form text styles
    inputText: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
        color: customColors.textPrimary,
    }),
    placeholder: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
        color: customColors.placeholder,
    }),
    errorText: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
        color: customColors.error,
    }),
    helperText: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
        color: customColors.textSecondary,
    }),

    // Link styles
    link: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        color: customColors.primary,
        textDecorationLine: "underline",
    }),
    linkSmall: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
        color: customColors.primary,
    }),

    // Badge/chip text
    badge: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(10),
        lineHeight: responsiveFontSize(14),
        color: customColors.white,
    }),
    chip: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
        color: customColors.textPrimary,
    }),

    // Price/number display
    price: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(18),
        lineHeight: responsiveFontSize(24),
        color: customColors.textPrimary,
    }),
    priceLarge: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(24),
        lineHeight: responsiveFontSize(32),
        color: customColors.textPrimary,
    }),
    priceSmall: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        color: customColors.textPrimary,
    }),

    // App-specific typography
    appTitle: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(20),
        lineHeight: responsiveFontSize(28),
        letterSpacing: 1,
    }),
    appSubtitle: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(13),
        lineHeight: responsiveFontSize(18),
        letterSpacing: 0.5,
    }),

    // Button variants
    buttonMedium: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
    }),

    // Divider text
    dividerText: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
    }),

    // Modal styles
    modalTitle: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(18),
        lineHeight: responsiveFontSize(24),
    }),

    // List item text
    listItem: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(15),
        lineHeight: responsiveFontSize(22),
    }),
    listItemBold: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(15),
        lineHeight: responsiveFontSize(22),
    }),

    // Footer text
    footerText: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
    }),
    footerCaption: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(10),
        lineHeight: responsiveFontSize(14),
    }),
};

export const shadows = {
    none: {
        shadowColor: "transparent",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    small: {
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    medium: {
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    large: {
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    xl: {
        shadowColor: customColors.black,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
};

// Border radius scale
export const borderRadius = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    round: 9999, // For circular elements
    full: "50%", // For percentage-based rounding
};

export const componentStyles = {
    // Card styles
    card: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.md,
        padding: moderateScale(16),
        ...shadows.small,
    },
    cardElevated: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        padding: moderateScale(16),
        ...shadows.medium,
    },
    cardOutlined: {
        backgroundColor: customColors.white,
        borderRadius: borderRadius.md,
        padding: moderateScale(16),
        borderWidth: 1,
        borderColor: customColors.border,
    },

    // Input styles
    input: {
        height: verticalScale(48),
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: customColors.grey300,
        paddingHorizontal: moderateScale(16),
        backgroundColor: customColors.white,
        ...typography.inputText(),
    },
    inputFocused: {
        height: verticalScale(48),
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: customColors.primary,
        paddingHorizontal: moderateScale(16),
        backgroundColor: customColors.white,
        ...typography.inputText(),
    },
    inputError: {
        height: verticalScale(48),
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: customColors.error,
        paddingHorizontal: moderateScale(16),
        backgroundColor: customColors.errorFaded,
        ...typography.inputText(),
    },
    inputDisabled: {
        height: verticalScale(48),
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: customColors.grey200,
        paddingHorizontal: moderateScale(16),
        backgroundColor: customColors.grey100,
        ...typography.inputText(),
        color: customColors.textDisabled,
    },

    // Button styles
    button: {
        primary: {
            backgroundColor: customColors.primary,
            paddingVertical: verticalScale(12),
            paddingHorizontal: moderateScale(24),
            borderRadius: borderRadius.md,
            ...shadows.small,
        },
        secondary: {
            backgroundColor: customColors.secondary,
            paddingVertical: verticalScale(12),
            paddingHorizontal: moderateScale(24),
            borderRadius: borderRadius.md,
            ...shadows.small,
        },
        success: {
            backgroundColor: customColors.success,
            paddingVertical: verticalScale(12),
            paddingHorizontal: moderateScale(24),
            borderRadius: borderRadius.md,
            ...shadows.small,
        },
        danger: {
            backgroundColor: customColors.error,
            paddingVertical: verticalScale(12),
            paddingHorizontal: moderateScale(24),
            borderRadius: borderRadius.md,
            ...shadows.small,
        },
        outline: {
            backgroundColor: customColors.transparent,
            paddingVertical: verticalScale(11),
            paddingHorizontal: moderateScale(23),
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: customColors.primary,
        },
        outlineSecondary: {
            backgroundColor: customColors.transparent,
            paddingVertical: verticalScale(11),
            paddingHorizontal: moderateScale(23),
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: customColors.grey400,
        },
        text: {
            backgroundColor: customColors.transparent,
            paddingVertical: verticalScale(12),
            paddingHorizontal: moderateScale(8),
        },
        disabled: {
            backgroundColor: customColors.disabled,
            paddingVertical: verticalScale(12),
            paddingHorizontal: moderateScale(24),
            borderRadius: borderRadius.md,
        },
    },

    // Badge styles
    badge: {
        paddingHorizontal: moderateScale(8),
        paddingVertical: verticalScale(4),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primary,
    },
    badgeSmall: {
        paddingHorizontal: moderateScale(6),
        paddingVertical: verticalScale(2),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primary,
    },

    // Chip styles
    chip: {
        paddingHorizontal: moderateScale(12),
        paddingVertical: verticalScale(6),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey200,
        flexDirection: "row",
        alignItems: "center",
    },
    chipSelected: {
        paddingHorizontal: moderateScale(12),
        paddingVertical: verticalScale(6),
        borderRadius: borderRadius.round,
        backgroundColor: customColors.primaryFaded,
        borderWidth: 1,
        borderColor: customColors.primary,
        flexDirection: "row",
        alignItems: "center",
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: customColors.divider,
    },
    dividerThick: {
        height: 8,
        backgroundColor: customColors.grey100,
    },

    // List item
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: verticalScale(12),
        paddingHorizontal: moderateScale(16),
        backgroundColor: customColors.white,
        borderBottomWidth: 1,
        borderBottomColor: customColors.divider,
    },

    // Avatar
    avatar: {
        small: {
            width: moderateScale(32),
            height: moderateScale(32),
            borderRadius: moderateScale(16),
        },
        medium: {
            width: moderateScale(48),
            height: moderateScale(48),
            borderRadius: moderateScale(24),
        },
        large: {
            width: moderateScale(64),
            height: moderateScale(64),
            borderRadius: moderateScale(32),
        },
    },
};

// Spacing scale for consistent layout (responsive)
export const spacing = {
    xxs: moderateScale(2),
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
};

// Fixed spacing (non-responsive, for pixel-perfect layouts)
export const fixedSpacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Common layout styles
export const layoutStyles = {
    container: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    containerWhite: {
        flex: 1,
        backgroundColor: customColors.white,
    },
    safeArea: {
        flex: 1,
        backgroundColor: customColors.background,
    },
    centerContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    rowBetween: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowAround: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },
    rowEvenly: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
    },
    column: {
        flexDirection: "column",
    },
    columnCenter: {
        flexDirection: "column",
        alignItems: "center",
    },
    flex1: {
        flex: 1,
    },
    wrap: {
        flexWrap: "wrap",
    },
    padding: {
        xs: { padding: moderateScale(4) },
        sm: { padding: moderateScale(8) },
        md: { padding: moderateScale(16) },
        lg: { padding: moderateScale(24) },
        xl: { padding: moderateScale(32) },
    },
    margin: {
        xs: { margin: moderateScale(4) },
        sm: { margin: moderateScale(8) },
        md: { margin: moderateScale(16) },
        lg: { margin: moderateScale(24) },
        xl: { margin: moderateScale(32) },
    },
};

// Hit slop for better touch targets
export const hitSlop = {
    small: { top: 8, bottom: 8, left: 8, right: 8 },
    medium: { top: 12, bottom: 12, left: 12, right: 12 },
    large: { top: 16, bottom: 16, left: 16, right: 16 },
};

// Z-index scale for layering
export const zIndex = {
    base: 0,
    dropdown: 100,
    sticky: 200,
    drawer: 300,
    modal: 400,
    popover: 500,
    toast: 600,
    tooltip: 700,
};

// Animation durations
export const animationDuration = {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
};
