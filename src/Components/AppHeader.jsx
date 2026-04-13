import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
    customColors,
    typography,
    spacing,
    responsiveSize,
} from "../Config/helper";
import EnhancedDropdown from "./EnhancedDropdown";

const iconLibraries = {
    MaterialIcon: MaterialIcon,
    FontAwesome: FontAwesome,
    AntDesign: AntDesign,
    MaterialCommunityIcons: MaterialCommunityIcons,
    FeatherIcon: FeatherIcon,
};

const AppHeader = ({
    title,
    navigation,
    showRightIcon = false,
    rightIconName = "",
    rightIconLibrary = "MaterialIcons",
    onRightPress = () => { },
    showBack = true,
    showDrawer = false,
    subtitle = "",
    name = "",
    badgeValue = 0,
    showBadge = false,
    showFilterDropdown = false,
    filterTitle = "",
    filterDropdownData = [],
    selectedFilter = "",
    onFilterChange = () => { },
}) => {
    const RightIcon = iconLibraries[rightIconLibrary];

    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerContent}>
                {/* Left Section */}
                {showDrawer ? (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.openDrawer()}
                        activeOpacity={0.7}>
                        <View style={styles.iconWrapper}>
                            <Icon
                                name="bars"
                                size={responsiveSize(20)}
                                color={customColors.white}
                            />
                        </View>
                    </TouchableOpacity>
                ) : showBack ? (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}>
                        <View style={styles.iconWrapper}>
                            <MaterialIcon
                                name="arrow-back-ios"
                                size={responsiveSize(20)}
                                color={customColors.white}
                            />
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}

                {/* Title Section */}
                <View style={styles.titleContainer}>
                    {name ? (
                        <View style={styles.welcomeContainer}>
                            <Text style={styles.welcomeText} numberOfLines={1}>
                                Welcome,{" "}
                                <Text style={styles.nameHighlight}>{name}</Text>
                            </Text>
                            {subtitle && (
                                <Text style={styles.subtitleText} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>
                    ) : (
                        <Text
                            style={styles.headerText}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}>
                            {title}
                        </Text>
                    )}
                </View>

                {/* Right Section */}
                <View style={styles.rightSection}>
                    {showFilterDropdown && (
                        <EnhancedDropdown
                            data={filterDropdownData}
                            labelField="label"
                            valueField="value"
                            placeholder={filterTitle}
                            value={selectedFilter}
                            onChange={onFilterChange}
                            iconOnly
                            iconName="filter"
                            iconColor={customColors.white}
                            iconSize={responsiveSize(20)}
                        />
                    )}
                    {showRightIcon && RightIcon ? (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onRightPress}
                            activeOpacity={0.7}>
                            <View style={styles.iconWrapper}>
                                <RightIcon
                                    name={rightIconName}
                                    size={responsiveSize(22)}
                                    color={customColors.white}
                                />
                                {showBadge && badgeValue > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {badgeValue > 99 ? "99+" : badgeValue}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ) : (
                        !showFilterDropdown && <View style={styles.placeholder} />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: customColors.primaryDark,
    },
    headerContent: {
        width: "100%",
        minHeight: responsiveSize(56),
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: spacing.sm,
        justifyContent: "center",
    },
    headerText: {
        ...typography.subtitle1(),
        color: customColors.white,
        textAlign: "center",
        fontWeight: "600",
        letterSpacing: 0.3,
    },
    welcomeContainer: {
        alignItems: "flex-start",
    },
    welcomeText: {
        ...typography.subtitle1(),
        color: customColors.white,
        fontWeight: "500",
    },
    nameHighlight: {
        color: "#FFD54F",
        fontWeight: "700",
    },
    subtitleText: {
        ...typography.caption(),
        color: "rgba(255,255,255,0.6)",
        marginTop: 2,
    },
    iconButton: {
        width: responsiveSize(40),
        height: responsiveSize(40),
        alignItems: "center",
        justifyContent: "center",
    },
    iconWrapper: {
        width: responsiveSize(36),
        height: responsiveSize(36),
        alignItems: "center",
        justifyContent: "center",
    },
    rightSection: {
        flexDirection: "row",
        alignItems: "center",
    },
    badge: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: customColors.error,
        borderRadius: responsiveSize(10),
        minWidth: responsiveSize(18),
        height: responsiveSize(18),
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: customColors.primaryDark,
    },
    badgeText: {
        ...typography.overline(),
        color: customColors.white,
        fontWeight: "700",
        fontSize: responsiveSize(10),
    },
    placeholder: {
        width: responsiveSize(40),
    },
});

export default AppHeader;
