import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    StyleSheet,
    Animated,
    Dimensions,
    Keyboard,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialIcon from "react-native-vector-icons/MaterialIcons";
import FeatherIcon from "react-native-vector-icons/Feather";
import {
    customColors,
    typography,
    spacing,
    shadows,
    borderRadius,
    iconSizes,
} from "../Config/helper";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const EnhancedDropdown = ({
    data,
    labelField,
    valueField,
    placeholder,
    value,
    onChange,
    showIcon = false,
    iconName = "filter",
    iconSize = iconSizes.lg,
    iconColor = customColors.white,
    iconOnly = false,
    containerStyle,
    searchPlaceholder = "Search...",
    placeholderStyle,
    selectedTextStyle,
    itemTextStyle,
    disabled = false,
    showCount = true,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const searchInputRef = useRef(null);

    const removeSplChar = (str) => String(str).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    const reactSelectFilterLogic = (option, inputValue) => {
        const normalizedLabel = removeSplChar(option.label);
        const normalizedInput = removeSplChar(inputValue);
        return normalizedLabel.includes(normalizedInput);
    };

    const filteredData =
        data?.filter(item => {
            if (!item || !item[labelField]) return false;
            if (searchQuery.trim()) {
                const option = { label: item[labelField] };
                return reactSelectFilterLogic(option, searchQuery);
            }
            return true;
        }) || [];

    const handleSearchInputChange = (text) => {
        const filteredText = text.replace(/[^a-zA-Z0-9\s]/g, "");
        setSearchQuery(filteredText);
    };

    const openModal = () => {
        setModalVisible(true);
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }),
            Animated.timing(backdropAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const closeModal = () => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalVisible(false);
            setSearchQuery("");
        });
    };

    const handleSelect = (item) => {
        onChange(item);
        closeModal();
    };

    const renderItem = ({ item, index }) => {
        if (!item || !item[labelField]) return null;
        const isSelected = value === item[valueField];

        return (
            <TouchableOpacity
                style={[
                    styles.dropdownItem,
                    isSelected && styles.selectedItem,
                    index === 0 && styles.firstItem,
                ]}
                activeOpacity={0.7}
                onPress={() => handleSelect(item)}>
                <View style={styles.itemContent}>
                    <View style={[
                        styles.itemIndicator,
                        isSelected && styles.itemIndicatorSelected
                    ]} />
                    <Text
                        style={[
                            styles.dropdownItemText,
                            itemTextStyle,
                            isSelected && styles.selectedItemText,
                            isSelected && selectedTextStyle,
                        ]}
                        numberOfLines={1}>
                        {item[labelField]}
                    </Text>
                </View>
                {isSelected && (
                    <View style={styles.checkContainer}>
                        <Icon
                            name="checkmark-circle"
                            size={iconSizes.md}
                            color={customColors.primary}
                        />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const getSelectedLabel = () => {
        if (!data || !Array.isArray(data)) return placeholder;
        const selectedItem = data.find(
            item => item && item[valueField] === value,
        );
        return selectedItem ? selectedItem[labelField] : placeholder;
    };

    const isValueSelected = value !== null && value !== undefined;

    return (
        <View style={[styles.container, containerStyle]}>
            {iconOnly ? (
                <TouchableOpacity
                    onPress={openModal}
                    disabled={disabled}
                    style={disabled && styles.disabledButton}>
                    <FeatherIcon
                        name={iconName}
                        size={iconSize}
                        color={disabled ? customColors.grey400 : iconColor}
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[
                        styles.dropdownButton,
                        showIcon && styles.dropdownButtonWithIcon,
                        isValueSelected && styles.dropdownButtonSelected,
                        disabled && styles.dropdownButtonDisabled,
                    ]}
                    activeOpacity={0.7}
                    disabled={disabled}
                    onPress={openModal}>
                    {showIcon && (
                        <FeatherIcon
                            name={iconName}
                            size={iconSize}
                            color={disabled ? customColors.grey400 : iconColor}
                            style={styles.iconStyle}
                        />
                    )}
                    <Text
                        style={[
                            styles.dropdownButtonText,
                            !isValueSelected && styles.placeholderText,
                            isValueSelected && styles.selectedButtonText,
                            value ? selectedTextStyle : placeholderStyle,
                            disabled && styles.disabledText,
                        ]}
                        numberOfLines={1}>
                        {getSelectedLabel()}
                    </Text>
                    <View style={styles.chevronContainer}>
                        <MaterialIcon
                            name="keyboard-arrow-down"
                            size={iconSizes.lg}
                            color={disabled ? customColors.grey400 : customColors.grey600}
                        />
                    </View>
                </TouchableOpacity>
            )}

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="none"
                statusBarTranslucent
                onRequestClose={closeModal}>
                <View style={styles.modalContainer}>
                    <Animated.View
                        style={[
                            styles.modalOverlay,
                            { opacity: backdropAnim },
                        ]}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={closeModal}
                        />
                    </Animated.View>

                    <Animated.View
                        style={[
                            styles.modalContent,
                            { transform: [{ translateY: slideAnim }] },
                        ]}>
                        {/* Handle indicator */}
                        <View style={styles.handleContainer}>
                            <View style={styles.handle} />
                        </View>

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.headerTitleContainer}>
                                <Text style={styles.modalTitle}>{placeholder}</Text>
                                {showCount && data && (
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countText}>
                                            {filteredData.length}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={closeModal}
                                style={styles.closeButton}
                                activeOpacity={0.7}>
                                <Icon
                                    name="close"
                                    size={iconSizes.lg}
                                    color={customColors.grey600}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Search */}
                        <View style={styles.searchContainer}>
                            <Icon
                                name="search"
                                size={iconSizes.md}
                                color={customColors.grey500}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                ref={searchInputRef}
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChangeText={handleSearchInputChange}
                                placeholderTextColor={customColors.grey400}
                                autoCorrect={false}
                                autoCapitalize="none"
                                maxLength={50}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearchQuery("")}
                                    style={styles.clearSearchButton}>
                                    <Icon
                                        name="close-circle"
                                        size={iconSizes.md}
                                        color={customColors.grey400}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* List */}
                        <FlatList
                            data={filteredData}
                            keyExtractor={item => item[valueField].toString()}
                            renderItem={renderItem}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.listContent}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <View style={styles.emptyIconContainer}>
                                        <Icon
                                            name="search-outline"
                                            size={iconSizes.xxl}
                                            color={customColors.grey300}
                                        />
                                    </View>
                                    <Text style={styles.emptyTitle}>
                                        No results found
                                    </Text>
                                    <Text style={styles.emptySubtitle}>
                                        Try adjusting your search
                                    </Text>
                                </View>
                            }
                        />
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    dropdownButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderWidth: 1.5,
        borderColor: customColors.grey200,
        minHeight: 52,
    },
    dropdownButtonWithIcon: {
        paddingLeft: spacing.sm,
    },
    dropdownButtonSelected: {
        borderColor: customColors.primary,
        backgroundColor: customColors.primary + "08",
    },
    dropdownButtonDisabled: {
        backgroundColor: customColors.grey100,
        borderColor: customColors.grey200,
    },
    dropdownButtonText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
    },
    placeholderText: {
        color: customColors.grey500,
    },
    selectedButtonText: {
        color: customColors.grey900,
        fontWeight: "500",
    },
    disabledText: {
        color: customColors.grey400,
    },
    disabledButton: {
        opacity: 0.5,
    },
    iconStyle: {
        marginRight: spacing.sm,
    },
    chevronContainer: {
        marginLeft: spacing.xs,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
    },
    modalOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
        backgroundColor: customColors.white,
        borderTopLeftRadius: borderRadius.xl + 8,
        borderTopRightRadius: borderRadius.xl + 8,
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.xl,
        maxHeight: SCREEN_HEIGHT * 0.75,
        ...shadows.large,
    },
    handleContainer: {
        alignItems: "center",
        paddingVertical: spacing.sm,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: customColors.grey300,
        borderRadius: borderRadius.round,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: spacing.sm,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey100,
    },
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    modalTitle: {
        ...typography.h6(),
        color: customColors.grey900,
        fontWeight: "600",
    },
    countBadge: {
        backgroundColor: customColors.primary + "15",
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xxs,
        borderRadius: borderRadius.round,
    },
    countText: {
        ...typography.caption(),
        color: customColors.primary,
        fontWeight: "600",
    },
    closeButton: {
        padding: spacing.xs,
        backgroundColor: customColors.grey100,
        borderRadius: borderRadius.round,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey50,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: customColors.grey200,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
        paddingVertical: spacing.md,
    },
    clearSearchButton: {
        padding: spacing.xs,
    },
    listContent: {
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        marginHorizontal: spacing.xs,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    firstItem: {
        marginTop: spacing.xs,
    },
    selectedItem: {
        backgroundColor: customColors.primary + "10",
    },
    itemContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    itemIndicator: {
        width: 4,
        height: 24,
        borderRadius: borderRadius.round,
        backgroundColor: "transparent",
        marginRight: spacing.md,
    },
    itemIndicatorSelected: {
        backgroundColor: customColors.primary,
    },
    dropdownItemText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey800,
    },
    selectedItemText: {
        color: customColors.primary,
        fontWeight: "600",
    },
    checkContainer: {
        marginLeft: spacing.sm,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: spacing.xxl,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: borderRadius.round,
        backgroundColor: customColors.grey100,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: spacing.md,
    },
    emptyTitle: {
        ...typography.subtitle1(),
        color: customColors.grey700,
        marginBottom: spacing.xs,
    },
    emptySubtitle: {
        ...typography.body2(),
        color: customColors.grey500,
    },
});

export default EnhancedDropdown;
