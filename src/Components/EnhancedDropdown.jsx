import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Modal,
    StyleSheet
} from "react-native";
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
    iconOnly = false
}) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredData = data.filter(item =>
        item[labelField].toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.dropdownItem} onPress={() => {
            onChange(item);
            setModalVisible(false);
            setSearchQuery("");
        }}
        >
            <Text style={styles.dropdownItemText}>
                {item[labelField]}
            </Text>
        </TouchableOpacity>
    );

    const getSelectedLabel = () => {
        const selectedItem = data.find(item => item[valueField] === value);
        return selectedItem ? selectedItem[labelField] : placeholder;
    };

    return (
        <View>
            {iconOnly ? (
                <TouchableOpacity onPress={() => setModalVisible(true)}>
                    <FeatherIcon
                        name={iconName}
                        size={iconSize}
                        color={iconColor}
                    />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={showIcon ? styles.dropdownButtonWithIcon : styles.dropdownButton}
                    onPress={() => setModalVisible(true)}
                >
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
                </TouchableOpacity>
            )}


            <Modal transparent={true}
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={customColors.accent}
                        />

                        <FlatList
                            data={filteredData}
                            keyExtractor={(item) => item[valueField].toString()}
                            renderItem={renderItem}
                            ListEmptyComponent={
                                <Text style={styles.noResultsText}>
                                    No data found
                                </Text>
                            }
                        />

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    dropdownButton: {
        backgroundColor: customColors.lightGrey,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: customColors.accent,
        marginHorizontal: 18,
        marginVertical: 15
    },
    dropdownButtonText: {
        ...typography.body1(),
        color: customColors.black,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 16,
    },
    modalContent: {
        maxHeight: "70%",
        backgroundColor: customColors.white,
        borderRadius: 12,
        padding: 16,
    },
    iconStyle: {
        marginRight: 8,
    },


    dropdownButtonWithIcon: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    searchInput: {
        ...typography.body1(),
        color: customColors.black,
        backgroundColor: customColors.lightGrey,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: customColors.accent,
    },
    dropdownItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: customColors.accent,
    },
    dropdownItemText: {
        ...typography.body1(),
        color: customColors.grey,
    },
    noResultsText: {
        ...typography.body1(),
        textAlign: "center",
        color: customColors.accent,
        padding: 16,
    },
    closeButton: {
        backgroundColor: customColors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        marginTop: 12,
        alignItems: "center",
    },
    closeButtonText: {
        ...typography.body1(),
        color: customColors.white,
        fontWeight: "600",
    },
});

export default EnhancedDropdown;