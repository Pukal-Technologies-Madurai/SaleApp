import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, FlatList, Image, ImageBackground, Modal, Button } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { API } from '../../Config/Endpoint';
import { customColors, typography } from '../../Config/helper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import FeatherIcon from 'react-native-vector-icons/Feather';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import assetImages from '../../Config/Image';

const Customers = () => {
    const navigation = useNavigation();
    const [data, setData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setModalVisible] = useState(false);
    const [selectedArea, setSelectedArea] = useState(null);  // State for area filter
    const [areas, setAreas] = useState([]);  // Assuming you have area list
    const colors = customColors;

    useEffect(() => {
        (async () => {
            try {
                const companyId = await AsyncStorage.getItem('Company_Id');
                fetchRetailersData(companyId)
            } catch (err) {
                console.log(err);
            }
        })();
    }, []);

    const fetchRetailersData = async (id) => {
        console.log(`${API.retailers}${id}`)
        try {
            const response = await fetch(`${API.retailers}${id}`);
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }
            const jsonData = await response.json();
            setData(jsonData.data);
            setFilteredData(jsonData.data);
            // Extract unique areas from the data
            const uniqueAreas = [...new Set(jsonData.data.map(item => item.Area_Id))];
            setAreas(uniqueAreas);  // Populate area list
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        applyFilters(query, selectedArea);  // Apply both search and area filters
    };

    const applyFilters = (query, area) => {
        if (Array.isArray(data)) {
            const filtered = data.filter(item => {
                const matchesSearch = item.Retailer_Name.toLowerCase().includes(query.toLowerCase()) ||
                    item.Mobile_No.includes(query);
                const matchesArea = area ? item.Area_Id === area : true;
                return matchesSearch && matchesArea;
            });
            setFilteredData(filtered);
        }
    };

    const handleAreaSelect = (areaId) => {
        setSelectedArea(areaId);  // Update selected area
        applyFilters(searchQuery, areaId);  // Apply area filter with the current search query
        setModalVisible(false);  // Close modal
    };

    const renderItem = useCallback(({ item }) => (
        <TouchableOpacity onPress={() => navigation.push("CustomersDetails", { item })} style={styles.card} >
            <View style={styles.cardContent}>
                <Text maxFontSizeMultiplier={1.2} style={styles.retailerName}>{item.Retailer_Name.trim()}</Text>
                <Text maxFontSizeMultiplier={1.2} style={styles.retailerDetail}>
                    <FontAwesomeIcon name="phone" size={16} color={colors.primary} /> {item.Mobile_No || 'N/A'}
                </Text>
                <Text maxFontSizeMultiplier={1.2} style={styles.retailerDetail}>
                    <Image source={assetImages.locationPin} /> {item.AreaGet}, {item.StateGet}
                </Text>
            </View>
            <FeatherIcon name="chevrons-right" size={25} color={colors.primary} />
        </TouchableOpacity>
    ), [colors, navigation]);

    const memoizedRenderItem = useMemo(() => renderItem, [renderItem]);

    return (
        <View style={styles.container}>
            <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Image source={assetImages.backArrow} />
                    </TouchableOpacity>
                    <Text style={styles.headerText} maxFontSizeMultiplier={1.2}>Retailers</Text>
                    {/* Add filter icon */}
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <FeatherIcon name="filter" size={25} color={colors.white} />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <TextInput
                        maxFontSizeMultiplier={1.2}
                        value={searchQuery}
                        style={styles.searchInput}
                        placeholder="Search by retailer name"
                        placeholderTextColor={customColors.accent}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                    />

                    {loading ? (
                        <ActivityIndicator style={styles.activityIndicator} size="large" color={colors.primary} />
                    ) : (
                        <>
                            {filteredData.length > 0 ? (
                                <FlatList
                                    data={filteredData}
                                    renderItem={memoizedRenderItem}
                                    keyExtractor={(item, index) => index.toString()}
                                    contentContainerStyle={styles.listContainer}
                                />
                            ) : (
                                <View style={styles.noDataContainer}>
                                    <Text maxFontSizeMultiplier={1.2} style={{ ...typography.h5(colors) }}>No data found</Text>
                                </View>
                            )}
                        </>
                    )}
                </View>

                {/* Modal for area filter */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isModalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Select Area</Text>
                            {areas.map((area) => (
                                <TouchableOpacity key={area} onPress={() => handleAreaSelect(area.areaId)} style={styles.modalItem}>
                                    <Text style={styles.modalItemText}>Area {area}</Text>
                                </TouchableOpacity>
                            ))}
                            <Button title="Close" onPress={() => setModalVisible(false)} />
                        </View>
                    </View>
                </Modal>

            </ImageBackground>
        </View>
    );
};

export default Customers;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: customColors.primary,
    },
    backgroundImage: {
        flex: 1,
        width: "100%",
        backgroundColor: customColors.background,
        alignItems: "center",
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
    },
    headerText: {
        flex: 1,
        ...typography.h4(),
        color: customColors.white,
        marginHorizontal: 10,
    },
    contentContainer: {
        width: "100%",
        height: "85%",
        backgroundColor: customColors.white,
        borderRadius: 7.5
    },
    activityIndicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchInput: {
        ...typography.h6(),
        backgroundColor: customColors.white,
        borderBottomColor: customColors.primary,
        borderBottomWidth: 1,
        paddingHorizontal: 10,
        margin: 15,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomColor: customColors.primary,
        borderBottomWidth: 3,
        padding: 10,
        marginVertical: 8,
        marginHorizontal: 20,
    },
    cardContent: {
        flex: 1,
        justifyContent: "center",
    },
    retailerDetails: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    retailerName: {
        ...typography.h6(),
        color: customColors.primary,
        fontWeight: "bold",
    },
    retailerDetail: {
        ...typography.body2(),
        color: customColors.primary,
        fontWeight: "bold",
        marginVertical: 2,
    },
    listContainer: {
        paddingBottom: 10,
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        color: customColors.primary,
        fontSize: 16,
    },

    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: 300,
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: {
        fontSize: 18,
        marginBottom: 10,
    },
    modalItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: '#ccc',
    },
    modalItemText: {
        fontSize: 16,
    },
});