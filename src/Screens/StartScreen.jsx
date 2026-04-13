import {
    View,
    StyleSheet,
    StatusBar,
    Image,
    Text,
    Animated,
    Easing,
} from "react-native";
import React, { useRef, useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import assetImages from "../Config/Image";
import {
    customColors,
    typography,
    spacing,
    responsiveSize,
} from "../Config/helper";
import { appVersion } from "../Api/auth";
import { SafeAreaView } from "react-native-safe-area-context";

const APP_VERSION = appVersion();

const StartScreen = () => {
    const navigation = useNavigation();
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    // Animation values
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const dotOpacity1 = useRef(new Animated.Value(0.3)).current;
    const dotOpacity2 = useRef(new Animated.Value(0.3)).current;
    const dotOpacity3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        // Start animations
        startAnimations();

        // Check token after delay
        const timer = setTimeout(() => {
            checkUserToken();
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const startAnimations = () => {
        // Logo entrance animation
        Animated.parallel([
            Animated.timing(logoScale, {
                toValue: 1,
                duration: 800,
                easing: Easing.elastic(1.2),
                useNativeDriver: true,
            }),
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // Text entrance animation (delayed)
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                    toValue: 0,
                    duration: 500,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start();
        }, 400);

        // Pulse animation for logo
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        ).start();

        // Loading dots animation
        animateLoadingDots();
    };

    const animateLoadingDots = () => {
        const animateDot = (dot, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(dot, {
                        toValue: 1,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(dot, {
                        toValue: 0.3,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]),
            ).start();
        };

        animateDot(dotOpacity1, 0);
        animateDot(dotOpacity2, 200);
        animateDot(dotOpacity3, 400);
    };

    const checkUserToken = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");

            if (token !== null) {
                setLoggedIn(true);
            } else {
                setLoggedIn(false);
            }
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading) {
            if (loggedIn) {
                navigation.replace("HomeScreen");
            } else {
                navigation.replace("LoginPortal");
            }
        }
    }, [loggedIn, loading, navigation]);

    return (
        <LinearGradient
            colors={["#0D47A1", "#1565C0", "#1976D2", "#2196F3"]}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 1 }}
        >
            <StatusBar
                backgroundColor="transparent"
                translucent
                barStyle="light-content"
            />

            {/* Main Content */}
            <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
                <View style={styles.content}>
                    {/* Logo Container */}
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            {
                                opacity: logoOpacity,
                                transform: [
                                    { scale: logoScale },
                                    { scale: pulseAnim },
                                ],
                            },
                        ]}
                    >
                        <Image
                            source={assetImages.logoWithoutText}
                            style={styles.logo}
                        />
                    </Animated.View>

                    {/* App Name */}
                    <Animated.View
                        style={[
                            styles.textContainer,
                            {
                                opacity: textOpacity,
                                transform: [{ translateY: textTranslateY }],
                            },
                        ]}
                    >
                        <Text style={styles.appTitle}>PUKAL VIRPANAIYAGAM</Text>
                        <Text style={styles.appSubtitle}>
                            Sales Force Automation
                        </Text>

                        {/* Loading Indicator */}
                        <View style={styles.loadingContainer}>
                            <Animated.View
                                style={[
                                    styles.loadingDot,
                                    { opacity: dotOpacity1 },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.loadingDot,
                                    { opacity: dotOpacity2 },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.loadingDot,
                                    { opacity: dotOpacity3 },
                                ]}
                            />
                        </View>
                    </Animated.View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Powered by Pukul Tech</Text>
                    <Text style={styles.versionText}>
                        Version {APP_VERSION}
                    </Text>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

export default StartScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.lg,
    },
    logoContainer: {
        // marginBottom: spacing.xl,
        alignItems: "center",
        justifyContent: "center",
    },
    logo: {
        width: responsiveSize(350),
        height: responsiveSize(350),
        resizeMode: "contain",
    },
    textContainer: {
        alignItems: "center",
    },
    appTitle: {
        ...typography.appTitle(),
        color: customColors.white,
        textAlign: "center",
        letterSpacing: 2,
        marginBottom: spacing.xs,
    },
    appSubtitle: {
        ...typography.appSubtitle(),
        color: "rgba(255, 255, 255, 0.85)",
        textAlign: "center",
        letterSpacing: 1,
        marginBottom: spacing.xl,
    },
    loadingContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: spacing.md,
    },
    loadingDot: {
        width: responsiveSize(8),
        height: responsiveSize(8),
        borderRadius: responsiveSize(4),
        backgroundColor: customColors.white,
        marginHorizontal: spacing.xs,
    },
    footer: {
        paddingBottom: responsiveSize(40),
        alignItems: "center",
    },
    footerText: {
        ...typography.footerText(),
        color: "rgba(255, 255, 255, 0.7)",
        marginBottom: spacing.xxs,
    },
    versionText: {
        ...typography.footerCaption(),
        color: "rgba(255, 255, 255, 0.5)",
    },
});
