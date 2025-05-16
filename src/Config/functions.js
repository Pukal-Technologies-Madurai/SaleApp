export const formatTime = dateString => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

export const formatDate = date => {
    return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

// const formatDate = inputDate => {
//     if (!inputDate) return "Select Date";

//     return new Intl.DateTimeFormat("en-GB").format(inputDate);
// };
