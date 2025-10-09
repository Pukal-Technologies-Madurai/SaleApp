import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    StyleSheet,
    Animated,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import FeatherIcon from "react-native-vector-icons/Feather";
import { customColors, typography, spacing, shadows } from "../Config/helper";

const EnhancedDropdown = ({
    data,
    labelField,
    valueField,
    placeholder,
    value,
    onChange,
    showIcon = false,
    iconName = "filter",
    iconSize = 24,
    iconColor = customColors.white,
    iconOnly = false,
    containerStyle,
    searchPlaceholder = "Search...",
    placeholderStyle,
    selectedTextStyle,
    itemTextStyle,
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [animation] = useState(new Animated.Value(0));

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

    const toggleModal = () => {
        setModalVisible(!modalVisible);
        Animated.timing(animation, {
            toValue: modalVisible ? 0 : 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const renderItem = ({ item }) => {
        if (!item || !item[labelField]) return null;
        return (
            <TouchableOpacity
                style={[
                    styles.dropdownItem,
                    value === item[valueField] && styles.selectedItem,
                ]}
                onPress={() => {
                    onChange(item);
                    toggleModal();
                    setSearchQuery("");
                }}>
                <Text
                    style={[
                        styles.dropdownItemText,
                        itemTextStyle,
                        value === item[valueField] && styles.selectedItemText,
                        value === item[valueField] && selectedTextStyle,
                    ]}>
                    {item[labelField]}
                </Text>
                {value === item[valueField] && (
                    <Icon
                        name="checkmark"
                        size={22}
                        color={customColors.primary}
                    />
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

    const modalTranslateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
    });

    return (
        <View style={[styles.container, containerStyle]}>
            {iconOnly ? (
                <TouchableOpacity onPress={toggleModal}>
                    <FeatherIcon
                        name={iconName}
                        size={iconSize}
                        color={iconColor}
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[
                        styles.dropdownButton,
                        showIcon && styles.dropdownButtonWithIcon,
                    ]}
                    onPress={toggleModal}>
                    {showIcon && (
                        <FeatherIcon
                            name={iconName}
                            size={iconSize}
                            color={iconColor}
                            style={styles.iconStyle}
                        />
                    )}
                    <Text
                        style={[
                            styles.dropdownButtonText,
                            value ? selectedTextStyle : placeholderStyle,
                        ]}>
                        {getSelectedLabel()}
                    </Text>
                    <Icon
                        name="chevron-down"
                        size={20}
                        color={customColors.grey}
                    />
                </TouchableOpacity>
            )}

            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={toggleModal}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={toggleModal}
                    />
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                transform: [{ translateY: modalTranslateY }],
                            },
                        ]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{placeholder}</Text>
                            <TouchableOpacity
                                onPress={toggleModal}
                                style={styles.closeButton}>
                                <Icon
                                    name="close"
                                    size={24}
                                    color={customColors.grey}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Icon
                                name="search"
                                size={20}
                                color={customColors.grey}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChangeText={handleSearchInputChange}
                                placeholderTextColor={customColors.grey}
                                autoCorrect={false}
                                autoCapitalize="none"
                                maxLength={50}
                            />
                        </View>

                        <FlatList
                            data={filteredData}
                            keyExtractor={item => item[valueField].toString()}
                            renderItem={renderItem}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Icon
                                        name="search-outline"
                                        size={40}
                                        color={customColors.grey}
                                    />
                                    <Text style={styles.emptyText}>
                                        No results found
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
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: customColors.white,
        borderRadius: 8,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: customColors.grey300,
        marginVertical: spacing.xs,
        ...shadows.small,
    },
    dropdownButtonWithIcon: {
        paddingLeft: spacing.sm,
    },
    dropdownButtonText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
    },
    iconStyle: {
        marginRight: spacing.sm,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        backgroundColor: customColors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.md,
        maxHeight: "80%",
        ...shadows.medium,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.md,
    },
    modalTitle: {
        ...typography.h6(),
        color: customColors.primary,
    },
    closeButton: {
        padding: spacing.xs,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.grey100,
        borderRadius: 8,
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.md,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
        paddingVertical: spacing.sm,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: customColors.grey200,
    },
    selectedItem: {
        backgroundColor: customColors.grey100,
    },
    dropdownItemText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.grey900,
    },
    selectedItemText: {
        color: customColors.primary,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        padding: spacing.md,
    },
    emptyText: {
        ...typography.body1(),
        color: customColors.grey500,
        marginTop: spacing.sm,
    },
});

export default EnhancedDropdown;
