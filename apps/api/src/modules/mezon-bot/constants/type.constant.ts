import {
    ApiMessageAttachment,
    ApiMessageMention,
    ApiMessageReaction,
    ApiMessageRef,
    ChannelMessage,
    ChannelMessageContent,
} from 'mezon-sdk';

export type ChannelMessageEvent = {
    id?: string;
    avatar?: string;
    channel_id?: string;
    mode?: number;
    channel_label?: string;
    clan_id?: string;
    code?: number;
    message_id?: string;
    sender_id?: string;
    update_time?: string;
    clan_logo?: string;
    category_name?: string;
    username?: string;
    clan_nick?: string;
    clan_avatar?: string;
    display_name?: string;
    content?: ChannelMessageContent;
    reactions?: Array<ApiMessageReaction>;
    mentions?: Array<ApiMessageMention>;
    attachments?: Array<ApiMessageAttachment>;
    referenced_message?: ChannelMessage;
    references?: Array<ApiMessageRef>;
    hide_editted?: boolean;
    is_public?: boolean;
    create_time_seconds?: number;
    update_time_seconds?: number;
    topic_id?: string;
};

export type TokenSendEvent = {
    sender_id: string;
    sender_name: string;
    receiver_id: string;
    amount: number;
    note: string;
    extra_attribute: string;
    transaction_id: string;
};

export type MessageButtonClickedEvent = {
    message_id: string;
    channel_id: string;
    button_id: string;
    sender_id: string;
    user_id: string;
    extra_data: string;
};
