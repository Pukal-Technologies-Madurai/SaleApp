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
import { customColors, typography } from "../Config/helper";

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
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [animation] = useState(new Animated.Value(0));

    const filteredData =
        data?.filter(item => {
            if (!item || !item[labelField]) return false;
            return item[labelField]
                .toString()
                .toLowerCase()
                .includes(searchQuery.toLowerCase());
        }) || [];

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
                        value === item[valueField] && styles.selectedItemText,
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
                    <Text style={styles.dropdownButtonText}>
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
                                onChangeText={setSearchQuery}
                                placeholderTextColor={customColors.grey}
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: customColors.lightGrey,
        marginVertical: 8,
    },
    dropdownButtonWithIcon: {
        paddingLeft: 12,
    },
    dropdownButtonText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.dark,
    },
    iconStyle: {
        marginRight: 8,
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
        padding: 16,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    modalTitle: {
        ...typography.h6(),
        color: customColors.primary,
    },
    closeButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: customColors.lightGrey,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        ...typography.body1(),
        color: customColors.dark,
        paddingVertical: 12,
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: customColors.lightGrey,
    },
    selectedItem: {
        backgroundColor: customColors.lightGrey,
    },
    dropdownItemText: {
        flex: 1,
        ...typography.body1(),
        color: customColors.dark,
    },
    selectedItemText: {
        color: customColors.primary,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        padding: 20,
    },
    emptyText: {
        ...typography.body1(),
        color: customColors.gray,
        marginTop: 8,
    },
});

export default EnhancedDropdown;
