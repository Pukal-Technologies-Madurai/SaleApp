import { Dimensions } from "react-native";

const deviceWidth = Dimensions.get("window").width;

const responsiveFontSize = baseFontSize => {
    const baseWidth = 375;
    const size = baseFontSize * (deviceWidth / baseWidth);
    return baseFontSize * (deviceWidth / baseWidth);
};

export const customFonts = {
    poppinsBlack: "Poppins-Black.ttf",
    poppinsRegular: "Poppins-Regular.ttf",
    poppinsThin: "Poppins-Thin.ttf",
    poppinsMedium: "Poppins-Medium.ttf",
    poppinsSemiBold: "Poppins-SemiBold.ttf",
    poppinsBold: "Poppins-Bold.ttf",
};

export const customColors = {
    background: "#003BFF",
    primary: "#0F2B70",
    secondary: "#FFE839",
    accent: "#9F9E9E",
    black: "#000000",
    white: "#ffffff",
    grey: "#808080",
    lightGrey: "#ddd",
};

export const typography = {
    h1: () => ({
        fontFamily: customFonts.poppinsBlack,
        fontSize: responsiveFontSize(32),
    }),
    h2: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(28),
    }),
    h3: () => ({
        fontFamily: customFonts.poppinsSemiBold,
        fontSize: responsiveFontSize(24),
    }),
    h4: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(20),
    }),
    h5: () => ({
        fontFamily: customFonts.poppinsMedium,
        fontSize: responsiveFontSize(18),
    }),
    h6: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(16),
    }),
    body1: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(14),
    }),
    body2: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(12),
    }),
    button: () => ({
        fontFamily: customFonts.poppinsBold,
        fontSize: responsiveFontSize(20),
    }),
    caption: () => ({
        fontFamily: customFonts.poppinsRegular,
        fontSize: responsiveFontSize(13),
    }),
    overline: () => ({
        fontFamily: customFonts.poppinsThin,
        fontSize: responsiveFontSize(10),
    }),
};
