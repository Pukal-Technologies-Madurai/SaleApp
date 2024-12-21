import React, { useEffect, useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  ImageBackground
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Dropdown } from "react-native-element-dropdown";
import Icon from "react-native-vector-icons/MaterialIcons";

import { API } from "../../Config/Endpoint";
import { customColors, typography } from "../../Config/helper";
import assetImages from "../../Config/Image";


const RetailerItem = memo(({ item, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.retailerCard}
  >
    <View style={styles.cardHeader}>
      <Icon name="store" size={24} color={customColors.primary} style={styles.storeIcon} />
      <Text style={styles.retailerName}>{item.Retailer_Name || 'No Name'}</Text>
    </View>

    <View style={styles.detailsContainer}>
      <View style={styles.detailRow}>
        <Icon name="route" size={18} color={customColors.primary} style={styles.detailIcon} />
        <Text style={styles.retailerDetails}>{item.RouteGet || 'No Route'}</Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="location-on" size={18} color={customColors.primary} style={styles.detailIcon} />
        <Text style={styles.retailerDetails}>{item.AreaGet || 'No Area'}</Text>
      </View>

      <View style={styles.detailRow}>
        <Icon name="phone" size={18} color={customColors.primary} style={styles.detailIcon} />
        <Text style={styles.retailerDetails}>{item.Mobile_No || 'No Contact'}</Text>
      </View>
    </View>
  </TouchableOpacity>
));

const Customers = () => {
  const navigation = useNavigation();

  const [retailers, setRetailers] = useState([]);
  const [filteredRetailers, setFilteredRetailers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [areas, setAreas] = useState([]);

  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);

  const renderItem = useCallback(({ item }) => (
    <RetailerItem
      item={item}
      onPress={() => navigation.push("CustomersDetails", { item })}
    />
  ), [navigation]);

  const keyExtractor = useCallback((item) => item.Retailer_Id.toString(), []);

  useEffect(() => {
    (async () => {
      try {
        const companyId = await AsyncStorage.getItem("Company_Id");
        await Promise.all([
          fetchRetailersData(companyId),
        ]);
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

      const { data } = await response.json();
      setRetailers(data);
      setFilteredRetailers(data);

      // Extract unique routes for dropdown
      const uniqueRoutes = [...new Set(data.map(item => item.Route_Id))]
        .map(routeId => ({
          label: data.find(item => item.Route_Id === routeId)?.RouteGet || '',
          value: routeId
        }))
        .filter(route => route.label);

      setRoutes(uniqueRoutes);

    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setLoading(false);
    }
  };

  // Update areas when route is selected
  useEffect(() => {
    if (selectedRoute) {
      const routeRetailers = retailers.filter(item => item.Route_Id === selectedRoute);
      const uniqueAreas = [...new Set(routeRetailers.map(item => item.Area_Id))]
        .map(areaId => ({
          label: routeRetailers.find(item => item.Area_Id === areaId)?.AreaGet || "",
          value: areaId
        }))
        .filter(area => area.label);

      setAreas(uniqueAreas);
      filterRetailers(selectedRoute, selectedArea, searchQuery);
    }
  }, [selectedRoute]);

  const filterRetailers = (routeId, areaId, search) => {
    let filtered = [...retailers];

    if (routeId) {
      filtered = filtered.filter(item => item.Route_Id === routeId);
    }

    if (areaId) {
      filtered = filtered.filter(item => item.Area_Id === areaId);
    }

    if (search) {
      filtered = filtered.filter(item =>
        item.Retailer_Name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredRetailers(filtered);
  };

  const clearFilters = () => {
    setSelectedRoute(null);
    setSelectedArea(null);
    setSearchQuery('');
    setFilteredRetailers(retailers);
  };

  const getItemLayout = useCallback((data, index) => ({
    length: 120,
    offset: 120 * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <ImageBackground source={assetImages.backgroundImage} style={styles.backgroundImage}>
        <View style={styles.overlay}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Image source={assetImages.backArrow} />
            </TouchableOpacity>
            <Text style={styles.headerText}>Retailers</Text>
          </View>

          <View style={styles.contentContainer} behavior={Platform.OS === "ios" ? "padding" : "height"} >
            {loading ? (
              <ActivityIndicator size="large" color={customColors.primary} style={{ flex: 1, justifyContent: "center" }} />
            ) : (
              <>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  itemTextStyle={styles.itemTextStyle}
                  data={routes}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Select Route"
                  value={selectedRoute}
                  onChange={item => {
                    setSelectedRoute(item.value);
                    setSelectedArea(null);
                  }}
                  renderLeftIcon={() => (
                    <Icon name="route" size={20} color={customColors.primary} style={styles.icon} />
                  )}
                />

                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  itemTextStyle={styles.itemTextStyle}
                  data={areas}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  placeholder="Select Area"
                  value={selectedArea}
                  onChange={item => {
                    setSelectedArea(item.value);
                    filterRetailers(selectedRoute, item.value, searchQuery);
                  }}
                  renderLeftIcon={() => (
                    <Icon name="location-on" size={20} color={customColors.primary} style={styles.icon} />
                  )}
                />

                <View style={styles.searchContainer}>
                  <Icon name="search" size={20} color={customColors.primary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search retailers..."
                    placeholderTextColor={customColors.grey}
                    value={searchQuery}
                    onChangeText={text => {
                      setSearchQuery(text);
                      filterRetailers(selectedRoute, selectedArea, text);
                    }}
                  />
                  {(searchQuery || selectedRoute || selectedArea) && (
                    <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                      <Icon name="close" size={20} color={customColors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
                <FlatList
                  data={filteredRetailers}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  getItemLayout={getItemLayout}
                  removeClippedSubviews={true}
                  maxToRenderPerBatch={10}
                  windowSize={10}
                  initialNumToRender={8}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                />
              </>
            )}
          </View>
        </View>

      </ImageBackground>
    </View>
  );
};

export default Customers;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    backgroundColor: customColors.background,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
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
    height: "100%",
    backgroundColor: customColors.white,
    borderRadius: 7.5,
  },
  activityIndicator: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  dropdown: {
    height: 50,
    marginVertical: 7.5,
    marginHorizontal: 15,
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: customColors.accent,
    borderRadius: 8,
  },
  icon: {
    marginRight: 8,
  },
  placeholderStyle: {
    ...typography.body1(),
    color: customColors.accent,
  },
  selectedTextStyle: {
    ...typography.body1(),
    color: customColors.accent,
    fontWeight: "500",
    color: customColors.black
  },
  itemTextStyle: {
    color: customColors.black,
    fontWeight: "400",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    marginVertical: 7.5,
    marginHorizontal: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: customColors.black,
  },
  clearButton: {
    padding: 8,
  },
  list: {
    flex: 1,
    marginBottom: 50
  },
  listContent: {
    padding: 16,
  },
  retailerCard: {
    backgroundColor: customColors.white,
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: customColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  storeIcon: {
    marginRight: 8,
  },
  retailerName: {
    flex: 1,
    ...typography.h6(),
    fontWeight: "bold",
    color: customColors.primary,
  },
  detailsContainer: {
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  detailIcon: {
    marginRight: 8,
    width: 22,
  },
  retailerDetails: {
    ...typography.body1(),
    color: customColors.grey,
    fontWeight: "600"
  },
});