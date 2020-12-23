import { LinakDesk } from "./desks/LinakDesk";
import { DeskModelItem } from "./desks/types";

const REGISTRY: DeskModelItem[] = [
    {
        name: "linak",
        cls: LinakDesk,
        services: [
            "99fa0020-338a-1024-8a49-009c0215f78a",
            "99fa0001-338a-1024-8a49-009c0215f78a",
        ]
    }
];


export default REGISTRY;