export const enrollmentMock = {
    year: 2024,
    mySchool: { id: 1, name: "Example School" },

    totals: {
        added: 120,
        graduated: 90,
        dismissed: 8,
        notInvited: 4,
        notReturning: 30,
    },

    attritionByGrade: [
        { gradeLabel: "Grade 9", added: 30, dismissed: 2, notInvited: 1, notReturning: 8 },
        { gradeLabel: "Grade 10", added: 25, dismissed: 1, notInvited: 1, notReturning: 6 },
        { gradeLabel: "Grade 11", added: 35, dismissed: 3, notInvited: 1, notReturning: 7 },
        { gradeLabel: "Grade 12", added: 30, dismissed: 2, notInvited: 1, notReturning: 9 },
    ],

    trend: {
        years: [2022, 2023, 2024],
        myAdded: [100, 110, 120],
        peerAvgAdded: [95, 105, 112],
    },
};