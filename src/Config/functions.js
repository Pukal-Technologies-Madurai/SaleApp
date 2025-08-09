export const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

export const formatDate = date => {
    // Handle undefined, null, or invalid date objects
    if (!date) return "Select Date";

    // Ensure it's a valid Date object
    const validDate = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(validDate.getTime())) return "Invalid Date";

    return validDate.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

// const formatDate = inputDate => {
//     if (!inputDate) return "Select Date";

//     return new Intl.DateTimeFormat("en-GB").format(inputDate);
// };
