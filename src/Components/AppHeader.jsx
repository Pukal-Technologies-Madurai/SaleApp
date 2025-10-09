import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import AntDesign from "react-native-vector-icons/AntDesign";
import FeatherIcon from "react-native-vector-icons/Feather";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { customColors, typography, spacing } from "../Config/helper";
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
                {showDrawer ? (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.openDrawer()}>
                        <Icon
                            name="bars"
                            size={24}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                ) : showBack ? (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => navigation.goBack()}>
                        <MaterialIcon
                            name="arrow-back"
                            size={24}
                            color={customColors.white}
                        />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}

                <View style={styles.titleContainer}>
                    {name ? (
                        <>
                            <Text style={styles.welcomeText}>
                                Welcome,{" "}
                                <Text style={styles.nameText}>{name}!</Text>
                            </Text>
                            {subtitle && (
                                <Text style={styles.subtitleText}>
                                    {subtitle}
                                </Text>
                            )}
                        </>
                    ) : (
                        <Text
                            style={styles.headerText}
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}>
                            {title}
                        </Text>
                    )}
                </View>

                <View>
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
                            iconSize={22}
                        />
                    )}
                    {showRightIcon && RightIcon ? (
                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={onRightPress}>
                            <View style={styles.iconContainer}>
                                <RightIcon
                                    name={rightIconName}
                                    size={24}
                                    color={customColors.white}
                                />
                                {showBadge && badgeValue > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>
                                            {badgeValue}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholder} />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = {
    headerContainer: {
        backgroundColor: customColors.primaryDark,
    },
    headerContent: {
        width: "100%",
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
    },
    titleContainer: {
        flex: 1,
        marginHorizontal: spacing.md,
    },
    headerText: {
        ...typography.h5(),
        color: customColors.white,
        textAlign: "center",
        fontWeight: "600",
    },
    welcomeText: {
        ...typography.h5(),
        color: customColors.white,
        textAlign: "left",
    },
    nameText: {
        color: customColors.secondary,
        fontWeight: "600",
    },
    subtitleText: {
        ...typography.caption(),
        color: customColors.grey200,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    iconContainer: {
        position: "relative",
    },
    badge: {
        position: "absolute",
        top: -10,
        right: -10,
        backgroundColor: customColors.accent2,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
    },
    badgeText: {
        ...typography.caption(),
        color: customColors.white,
        fontWeight: "bold",
    },
    placeholder: {
        width: 40,
    },
};

export default AppHeader;
