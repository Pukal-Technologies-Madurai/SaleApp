import { Dimensions } from "react-native";

const deviceWidth = Dimensions.get("window").width;

const responsiveFontSize = baseFontSize => {
    const baseWidth = 375;
    return baseFontSize * (deviceWidth / baseWidth);
};

export const customFonts = {
    poppinsBlack: "Poppins-Black.ttf",
    poppinsRegular: "Poppins-Regular.ttf",
    poppinsThin: "Poppins-Thin.ttf",
    poppinsMedium: "Poppins-Medium.ttf",
    poppinsSemiBold: "Poppins-SemiBold.ttf",
    poppinsBold: "Poppins-Bold.ttf",
    poppinsLight: "Poppins-Light.ttf",
    poppinsItalic: "Poppins-Italic.ttf",
};

export const customColors = {
    // Primary colors
    primary: "#2196F3",
    primaryLight: "#64B5F6",
    primaryDark: "#1976D2",

    // Secondary colors
    secondary: "#FFC107",
    secondaryLight: "#FFD54F",
    secondaryDark: "#FFA000",

    // Accent colors
    accent: "#FF4081",
    accent1: "#FF80AB",
    accent2: "#F50057",

    // Status colors
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3",

    // Neutral colors
    black: "#000000",
    white: "#FFFFFF",
    background: "#F5F5F5",

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
};

export const typography = {
    h1: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(32),
        lineHeight: responsiveFontSize(40),
    }),
    h2: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(28),
        lineHeight: responsiveFontSize(36),
    }),
    h3: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(24),
        lineHeight: responsiveFontSize(32),
    }),
    h4: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(20),
        lineHeight: responsiveFontSize(28),
    }),
    h5: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(18),
        lineHeight: responsiveFontSize(24),
    }),
    h6: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
    }),
    subtitle1: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
    }),
    subtitle2: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
    }),
    body1: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(16),
        lineHeight: responsiveFontSize(24),
    }),
    body2: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
    }),
    button: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        textTransform: "uppercase",
    }),
    caption: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(12),
        lineHeight: responsiveFontSize(16),
    }),
    overline: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(10),
        lineHeight: responsiveFontSize(12),
        letterSpacing: 1.5,
        textTransform: "uppercase",
    }),
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
        lineHeight: responsiveFontSize(14),
    }),
    label: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(14),
        lineHeight: responsiveFontSize(20),
        letterSpacing: 0.1,
        color: customColors.grey700,
    }),
};

export const shadows = {
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
};

export const componentStyles = {
    card: {
        backgroundColor: customColors.background,
        borderRadius: 8,
        padding: 16,
        ...shadows.small,
    },
    input: {
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: customColors.grey300,
        paddingHorizontal: 16,
        ...typography.body1(),
    },
    button: {
        primary: {
            backgroundColor: customColors.primary,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            ...shadows.small,
        },
        secondary: {
            backgroundColor: customColors.secondary,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            ...shadows.small,
        },
        outline: {
            backgroundColor: "transparent",
            paddingVertical: 11,
            paddingHorizontal: 23,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: customColors.primary,
        },
        text: {
            backgroundColor: "transparent",
            paddingVertical: 12,
            paddingHorizontal: 8,
        },
    },
};

// Spacing scale for consistent layout
export const spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};
