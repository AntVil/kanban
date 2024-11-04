let dragElement = null;
let dropElement = null;
let dragElementHeight = 0;
let dragElementIndex = -1;

window.onload = () => {
    const state = {
        columns: ["column1", "column2", "column3", "column4"],
        cards: [
            {
                content: "hello world\nabc\nabc",
                column: 0
            },
            {
                content: "hello world2",
                column: 0
            },
            {
                content: "hello world3\nabc",
                column: 0
            },
            {
                content: "hello world3",
                column: 0
            },
            {
                content: "hello world\nabc\nabc",
                column: 0
            },
            {
                content: "hello world2",
                column: 0
            },
            {
                content: "hello world3\nabc",
                column: 0
            },
            {
                content: "hello world3",
                column: 0
            },
            {
                content: "hello world\nabc\nabc",
                column: 0
            },
            {
                content: "hello world2",
                column: 0
            },
            {
                content: "hello world3\nabc",
                column: 0
            },
            {
                content: "hello world3",
                column: 0
            },
            {
                content: "hello world\nabc\nabc",
                column: 0
            },
            {
                content: "hello world2",
                column: 0
            },
            {
                content: "hello world3\nabc",
                column: 0
            },
            {
                content: "hello world3",
                column: 0
            },
            {
                content: "hello world3\nabc\nabc",
                column: 0
            },
            {
                content: "hello world3",
                column: 0
            },
            {
                content: "bar",
                column: 0
            },
            {
                content: "bye world",
                column: 2
            }
        ]
    }

    window.addEventListener("dragover", (e) => {
        // prevent drag cancel animation (sadly only cancels inside browser window)
        e.preventDefault();
    })

    const mainElement = document.querySelector("main");
    const addButtonElement = mainElement.querySelector("button");

    for (let i = 0; i < state.columns.length; i++) {
        const column = state.columns[i];
        const columnCards = state.cards.filter((card) => card.column === i);

        mainElement.insertBefore(
            createColumn(column, columnCards),
            addButtonElement
        );
    }

    addButtonElement.addEventListener("click", () => {
        mainElement.insertBefore(
            createColumn("new column", []),
            addButtonElement
        );
    });
}

function createColumn(columnName, columnCards) {
    const columnElement = document.createElement("section");
    const columnHeader = document.createElement("input");
    const columnBody = document.createElement("ol");
    const columnFooter = document.createElement("div");
    const columnDeleteButton = document.createElement("button");

    columnHeader.setAttribute("type", "text");
    columnHeader.setAttribute("value", columnName);
    columnDeleteButton.innerText = "Delete Column"

    columnDeleteButton.addEventListener("click", (e) => {
        columnElement.remove();
    });

    columnBody.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (dropElement !== columnBody) {
            dropElement.classList.remove("dragover")
            dropElement?.style?.setProperty("--drag-placeholder-height", "");
            dropElement?.style?.setProperty("--drag-placeholder-index", "");
            dropElement = columnBody;
        }

        let index = -1;
        let encounteredSelf = false;
        for (let i = 0; i < dropElement.children.length; i++) {
            const child = dropElement.children[i];

            if (child === dragElement) {
                encounteredSelf = true;
                continue;
            }

            const rect = child.getBoundingClientRect();

            if (rect.y + rect.height / 2 > e.clientY) {
                index = i;
                break;
            }
        }

        if (index !== -1) {
            dragElementIndex = index
        } else {
            dragElementIndex = dropElement.children.length;
        }

        if (encounteredSelf) {
            // encountering the hidden node shifts ordering
            dragElementIndex -= 1;
        }

        dropElement.classList.add("dragover")
        dropElement.style.setProperty("--drag-placeholder-height", `${dragElementHeight}px`);
        dropElement.style.setProperty("--drag-placeholder-index", `${dragElementIndex + 1}`);
        e.dataTransfer.dropEffect = "move";
    });
    // columnBody.addEventListener("drop", (e) => {
    //     // e.preventDefault();
    //     // dropElement.appendChild(dragElement);
    //     // console.log("drop")
    //     // dropElement.style.setProperty("--drag-placeholder-height", "");
    //     // dropElement.style.setProperty("--drag-placeholder-index", "");
    // });

    columnElement.append(columnHeader, columnBody, columnFooter);
    for (const card of columnCards) {
        columnBody.appendChild(createCard(card));
    }
    columnFooter.appendChild(columnDeleteButton)

    return columnElement;
}

function createCard(card) {
    const cardElement = document.createElement("li");
    cardElement.innerText = card.content;
    cardElement.setAttribute("draggable", "true");

    cardElement.addEventListener("dragstart", (e) => {
        dragElement = cardElement;
        dropElement = cardElement.parentElement;

        dragElementHeight = dragElement.getBoundingClientRect().height;
        dragElementIndex = Array.from(dropElement.children).indexOf(dragElement);

        setTimeout(() => {
            if (dropElement.children.length === 1) {
                dropElement.classList.add("pseudo-empty");
            }

            // hide element during drag
            dragElement.style.display = "none";
            dropElement.classList.add("dragover")
            dropElement.style.setProperty("--drag-placeholder-height", `${dragElementHeight}px`);
            dropElement.style.setProperty("--drag-placeholder-index", `${dragElementIndex + 1}`);
        });
    });

    cardElement.addEventListener("dragend", (e) => {
        e.preventDefault();
        dragElement.style.display = "";

        dragElement.parentElement.classList.remove("pseudo-empty");

        const previousElement = dropElement.children[dragElementIndex];
        if (previousElement) {
            let encounteredSelf = false;
            let element = previousElement;
            while (element !== null) {
                if (element === dragElement) {
                    encounteredSelf = true;
                    break;
                }
                element = element.previousElementSibling;
            }
            if (encounteredSelf) {
                dropElement.insertBefore(dragElement, previousElement.nextElementSibling);
            } else {
                dropElement.insertBefore(dragElement, previousElement);
            }
        } else {
            dropElement.appendChild(dragElement);
        }

        dropElement.classList.remove("dragover")
        dropElement.style.setProperty("--drag-placeholder-height", "");
        dropElement.style.setProperty("--drag-placeholder-index", "");

        dragElement = null;
        dropElement = null;
    });

    return cardElement;
}
