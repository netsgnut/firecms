import React, { useState } from "react";
import {
    AdditionalColumnDelegate,
    CollectionSize,
    Entity,
    EntityCollection,
    EntitySchema
} from "../models";
import CollectionTable from "./CollectionTable";
import { CMSFormField } from "../form/form_factory";
import {
    Box,
    Button,
    IconButton,
    Popover,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme
} from "@material-ui/core";
import { Add, Delete, InfoOutlined } from "@material-ui/icons";
import { CollectionRowActions } from "./CollectionRowActions";
import DeleteEntityDialog from "./DeleteEntityDialog";
import { getSubcollectionColumnId, useColumnIds } from "./common";
import { useAuthContext, useSideEntityController } from "../contexts";
import ExportButton from "./ExportButton";

import ReactMarkdown from "react-markdown";
import { canCreate, canDelete, canEdit } from "../util/permissions";

type EntityCollectionProps<S extends EntitySchema<Key>, Key extends string> = {
    collectionPath: string;
    collectionConfig: EntityCollection<any>;
}

/**
 * This component is in charge of binding a Firestore path with an {@link EntityCollection}
 * where it's configuration is defined. This is useful if you have defined already
 * your entity collections and need to build a custom component.
 *
 * If you need a lower level implementation with more granular options, you
 * can try CollectionTable, which still does data fetching from Firestore.
 *
 * @param collectionPath
 * @param collectionConfig
 * @constructor
 */
export default function EntityCollectionTable<S extends EntitySchema<Key>, Key extends string>({
                                                                                                   collectionPath,
                                                                                                   collectionConfig
                                                                                               }: EntityCollectionProps<S, Key>
) {

    const sideEntityController = useSideEntityController();

    const theme = useTheme();
    const largeLayout = useMediaQuery(theme.breakpoints.up("md"));
    const authContext = useAuthContext();

    const [deleteEntityClicked, setDeleteEntityClicked] = React.useState<Entity<S, Key> | Entity<S, Key>[] | undefined>(undefined);
    const [selectedEntities, setSelectedEntities] = useState<Entity<S, Key>[]>([]);

    const exportable = collectionConfig.exportable === undefined || collectionConfig.exportable;
    const inlineEditing = collectionConfig.inlineEditing === undefined || collectionConfig.inlineEditing;

    const selectionEnabled = collectionConfig.selectionEnabled === undefined || collectionConfig.selectionEnabled;
    const paginationEnabled = collectionConfig.pagination === undefined || collectionConfig.pagination;
    const displayedProperties = useColumnIds(collectionConfig, true);

    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);

    const subcollectionColumns: AdditionalColumnDelegate<any>[] = collectionConfig.subcollections?.map((subcollection) => {
        return {
            id: getSubcollectionColumnId(subcollection),
            title: subcollection.name,
            width: 200,
            builder: (entity: Entity<any>) => (
                <Button color={"primary"}
                        onClick={(event) => {
                            event.stopPropagation();
                            sideEntityController.open({
                                collectionPath: collectionPath,
                                entityId: entity.id,
                                selectedSubcollection: subcollection.relativePath,
                                permissions: subcollection.permissions,
                                schema: collectionConfig.schema,
                                subcollections: collectionConfig.subcollections,
                                overrideSchemaResolver: false
                            });
                        }}>
                    {subcollection.name}
                </Button>
            )
        };
    }) ?? [];

    const additionalColumns = [...collectionConfig.additionalColumns ?? [], ...subcollectionColumns];

    const onEntityClick = (collectionPath: string, entity: Entity<S, Key>) => {
        sideEntityController.open({
            entityId: entity.id,
            collectionPath,
            permissions: collectionConfig.permissions,
            schema: collectionConfig.schema,
            subcollections: collectionConfig.subcollections,
            overrideSchemaResolver: false
        });
    };

    const onNewClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        return collectionPath && sideEntityController.open({
            collectionPath,
            permissions: collectionConfig.permissions,
            schema: collectionConfig.schema,
            subcollections: collectionConfig.subcollections,
            overrideSchemaResolver: false
        });
    };

    const internalOnEntityDelete = (collectionPath: string, entity: Entity<S, Key>) => {
        setSelectedEntities(selectedEntities.filter((e) => e.id !== entity.id));
    };

    const internalOnMultipleEntitiesDelete = (collectionPath: string, entities: Entity<S, Key>[]) => {
        setSelectedEntities([]);
    };

    const checkInlineEditing = (entity: Entity<any>) => {
        if (!canEdit(collectionConfig.permissions, authContext.loggedUser, entity)) {
            return false;
        }
        return inlineEditing;
    };

    const title = (
        <>

            <Typography variant="h6">
                {`${collectionConfig.name}`}
            </Typography>
            <Typography variant={"caption"} color={"textSecondary"}>
                {`/${collectionPath}`}
            </Typography>

            {collectionConfig.description && <>
                <span style={{ paddingLeft: "8px" }}>
                <IconButton
                    size={"small"}
                    style={{
                        width: 16,
                        height: 16
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setAnchorEl(e.currentTarget);
                    }}>
                    <InfoOutlined fontSize={"small"}/>
                </IconButton>
                    </span>
                <Popover
                    id={"info-dialog"}
                    open={!!anchorEl}
                    anchorEl={anchorEl}
                    onClose={() => {
                        setAnchorEl(null);
                    }}
                    anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center"
                    }}
                    transformOrigin={{
                        vertical: "top",
                        horizontal: "center"
                    }}
                >
                    <Box m={2}>
                        <ReactMarkdown>{collectionConfig.description}</ReactMarkdown>
                    </Box>
                </Popover>
            </>}

        </>
    );

    const toggleEntitySelection = (entity: Entity<S, Key>) => {
        let newValue;
        if (selectedEntities.indexOf(entity) > -1) {
            newValue = selectedEntities.filter((item: Entity<S, Key>) => item !== entity);
        } else {
            newValue = [...selectedEntities, entity];
        }
        setSelectedEntities(newValue);
    };

    const tableRowButtonsBuilder = ({
                                        entity,
                                        size
                                    }: { entity: Entity<any>, size: CollectionSize }) => {

        const isSelected = selectedEntities.indexOf(entity) > -1;

        return (
            <CollectionRowActions
                entity={entity}
                isSelected={isSelected}
                collectionPath={collectionPath}
                createEnabled={canCreate(collectionConfig.permissions, authContext.loggedUser)}
                editEnabled={canEdit(collectionConfig.permissions, authContext.loggedUser, entity)}
                deleteEnabled={canDelete(collectionConfig.permissions, authContext.loggedUser, entity)}
                selectionEnabled={selectionEnabled}
                size={size}
                toggleEntitySelection={toggleEntitySelection}
                onDeleteClicked={setDeleteEntityClicked}
                schema={collectionConfig.schema}
                subcollections={collectionConfig.subcollections}
            />
        );

    };

    function toolbarActionsBuilder({
                                       size,
                                       data
                                   }: { size: CollectionSize, data: Entity<any>[] }) {

        const addButton = canCreate(collectionConfig.permissions, authContext.loggedUser) && onNewClick && (largeLayout ?
            <Button
                onClick={onNewClick}
                startIcon={<Add/>}
                size="large"
                variant="contained"
                color="primary">
                Add {collectionConfig.schema.name}
            </Button>
            : <Button
                onClick={onNewClick}
                size="medium"
                variant="contained"
                color="primary"
            >
                <Add/>
            </Button>);

        const multipleDeleteEnabled = selectedEntities.every((entity) => canDelete(collectionConfig.permissions, authContext.loggedUser, entity));
        const multipleDeleteButton = selectionEnabled &&

            <Tooltip
                title={multipleDeleteEnabled ? "Multiple delete" : "You have selected one entity you cannot delete"}>
                <span>
                    <Button
                        disabled={!(selectedEntities?.length) || !multipleDeleteEnabled}
                        startIcon={<Delete/>}
                        onClick={(event: React.MouseEvent) => {
                            event.stopPropagation();
                            setDeleteEntityClicked(selectedEntities);
                        }}
                        color={"primary"}
                    >
                        <p style={{ minWidth: 24 }}>({selectedEntities?.length})</p>
                    </Button>
                </span>
            </Tooltip>;

        const extraActions = collectionConfig.extraActions ? collectionConfig.extraActions({
            view: collectionConfig,
            selectedEntities
        }) : undefined;

        const exportButton = exportable &&
            <ExportButton schema={collectionConfig.schema}
                          collectionPath={collectionPath}/>;

        return (
            <>
                {extraActions}
                {multipleDeleteButton}
                {exportButton}
                {addButton}
            </>
        );
    }

    return (<>

            <CollectionTable
                collectionPath={collectionPath}
                schema={collectionConfig.schema}
                additionalColumns={additionalColumns}
                defaultSize={collectionConfig.defaultSize}
                displayedProperties={displayedProperties}
                filterableProperties={collectionConfig.filterableProperties}
                initialFilter={collectionConfig.initialFilter}
                initialSort={collectionConfig.initialSort}
                inlineEditing={checkInlineEditing}
                onEntityClick={onEntityClick}
                textSearchDelegate={collectionConfig.textSearchDelegate}
                tableRowWidgetBuilder={tableRowButtonsBuilder}
                paginationEnabled={paginationEnabled}
                toolbarWidgetBuilder={toolbarActionsBuilder}
                title={title}
                CMSFormField={CMSFormField}
                frozenIdColumn={largeLayout}
            />

            <DeleteEntityDialog entityOrEntitiesToDelete={deleteEntityClicked}
                                collectionPath={collectionPath}
                                schema={collectionConfig.schema}
                                open={!!deleteEntityClicked}
                                onEntityDelete={internalOnEntityDelete}
                                onMultipleEntitiesDelete={internalOnMultipleEntitiesDelete}
                                onClose={() => setDeleteEntityClicked(undefined)}/>
        </>
    );
}

export { EntityCollectionTable };
